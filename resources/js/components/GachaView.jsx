import React, { useState, useEffect, useMemo } from 'react';
import {
    Sparkles,
    Plus,
    RotateCcw,
    Trash2,
    Filter,
    Search,
    Layers,
    Zap,
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Flame,
    BookOpen,
    X,
    RefreshCw,
    Calendar,
    Dice5,
    Pencil
} from 'lucide-react';
import RarityBadge from './RarityBadge';
import Quick10PullModal from './Quick10PullModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import GachaProbabilitySimulator from './GachaProbabilitySimulator';
import EditGachaPullModal from './EditGachaPullModal';
import BulkEditGachaPullModal from './BulkEditGachaPullModal';

export default function GachaView({ onNotify, baseRate = 3.0, setBaseRate }) {
    // State
    const [activeMainTab, setActiveMainTab] = useState('history'); // 'history' | 'simulator'
    const [pulls, setPulls] = useState([]);
    const [editingPull, setEditingPull] = useState(null);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Gacha Database Metadata & Autocomplete states
    const [gachaMeta, setGachaMeta] = useState({ characters: [], support_cards: [] });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // Quick 10-Pull Modal & Delete Modal
    const [showQuick10Modal, setShowQuick10Modal] = useState(false);
    const [selectedPullIds, setSelectedPullIds] = useState([]);
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        mode: 'single', // 'single' or 'bulk'
        id: null,
        count: 1,
        loading: false,
    });
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [bulkPullType, setBulkPullType] = useState('custom_ticket');
    const [bulkUpdating, setBulkUpdating] = useState(false);

    // 2026 Banners & Filter state
    const [banners, setBanners] = useState([]);
    const [selectedBannerId, setSelectedBannerId] = useState('');
    const [singleBannerId, setSingleBannerId] = useState('');
    const [bannerError, setBannerError] = useState(false);
    const [singleBannerError, setSingleBannerError] = useState(false);
    const [gachaBannerFilter, setGachaBannerFilter] = useState('all');
    const todayDate = new Date().toISOString().slice(0, 10);

    // Filters
    const [bannerFilter, setBannerFilter] = useState('all');
    const [rarityFilter, setRarityFilter] = useState('all');
    const [isRateUpFilter, setIsRateUpFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [ratePoolFilter, setRatePoolFilter] = useState('all'); // 'all', 'standard', 'boosted'
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // Form Mode: 'single', 'custom' (1-10 tickets), or 'multi_10'
    const [pullMode, setPullMode] = useState('custom');

    // Single Form state
    const [singleForm, setSingleForm] = useState({
        banner_type: 'character',
        gacha_banner_id: '',
        pull_type: 'single',
        item_name: '',
        rarity: 'SSR',
        is_rate_up: false,
        pulled_at: todayDate,
    });

    // Custom / Multi Pull state
    const [multiBanner, setMultiBanner] = useState('character');
    const [multiPulledAt, setMultiPulledAt] = useState(todayDate);
    const [ticketCount, setTicketCount] = useState(10);
    const [validationErrors, setValidationErrors] = useState([]);

    const makeDefaultPulls = (count) => {
        return Array.from({ length: count }, (_, idx) => ({
            item_name: '',
            rarity: idx === count - 1 && count >= 10 ? 'SR' : 'R',
            is_rate_up: false,
        }));
    };

    const [multiPulls, setMultiPulls] = useState(makeDefaultPulls(10));

    // Fetch Stats & Pulls
    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/gacha/stats?banner_type=${bannerFilter}&gacha_banner_id=${gachaBannerFilter}&base_rate=${baseRate}&rate_pool=${ratePoolFilter}`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchPulls = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                banner_type: bannerFilter,
                gacha_banner_id: gachaBannerFilter,
                rarity: rarityFilter,
                rate_pool: ratePoolFilter,
                search: searchQuery,
                page: String(page),
                per_page: String(perPage),
            });
            if (dateFrom) query.append('date_from', dateFrom);
            if (dateTo) query.append('date_to', dateTo);
            if (isRateUpFilter !== 'all') query.append('is_rate_up', isRateUpFilter);

            const res = await fetch(`/api/gacha/pulls?${query.toString()}`);
            const data = await res.json();
            setPulls(data.data || []);
            setPagination({
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                total: data.total || 0,
            });
        } catch (err) {
            console.error('Failed to fetch pulls:', err);
            onNotify?.('Error loading gacha pulls', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetFilters = () => {
        setDateFrom('');
        setDateTo('');
        setGachaBannerFilter('all');
        setBannerFilter('all');
        setRarityFilter('all');
        setIsRateUpFilter('all');
        setRatePoolFilter('all');
        setSearchQuery('');
        setPage(1);
    };

    const openDeleteModal = (mode, id = null) => {
        setDeleteModal({
            isOpen: true,
            mode,
            id,
            count: mode === 'bulk' ? selectedPullIds.length : 1,
            loading: false,
        });
    };

    const handleConfirmDelete = async () => {
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            if (deleteModal.mode === 'single' && deleteModal.id) {
                const res = await fetch(`/api/gacha/pulls/${deleteModal.id}`, {
                    method: 'DELETE',
                    headers: { 'Accept': 'application/json' },
                });
                if (res.ok) {
                    onNotify?.('Data pull berhasil dihapus.', 'info');
                    setSelectedPullIds(prev => prev.filter(i => i !== deleteModal.id));
                } else {
                    throw new Error('Gagal menghapus data pull.');
                }
            } else if (deleteModal.mode === 'bulk' && selectedPullIds.length > 0) {
                const res = await fetch('/api/gacha/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ ids: selectedPullIds }),
                });
                const result = await res.json();
                if (res.ok) {
                    onNotify?.(result.message || `${selectedPullIds.length} data pull berhasil dihapus.`, 'info');
                    setSelectedPullIds([]);
                } else {
                    throw new Error(result.message || 'Gagal menghapus data secara massal.');
                }
            }
            setDeleteModal({ isOpen: false, mode: 'single', id: null, count: 1, loading: false });
            fetchStats();
            fetchPulls();
        } catch (err) {
            onNotify?.(err.message || 'Terjadi kesalahan saat menghapus data.', 'error');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleQuickBulkUpdatePullType = async () => {
        if (selectedPullIds.length === 0) return;
        setBulkUpdating(true);
        try {
            const res = await fetch('/api/gacha/pulls/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    ids: selectedPullIds,
                    pull_type: bulkPullType,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengubah tipe pull secara massal.');
            }
            onNotify?.(data.message || `${data.updated_count} data pull berhasil diubah.`, 'success');
            setSelectedPullIds([]);
            fetchPulls();
            fetchStats();
        } catch (err) {
            console.error('Error during quick bulk pull type update:', err);
            onNotify?.(err.message || 'Gagal memperbarui tipe pull.', 'error');
        } finally {
            setBulkUpdating(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchPulls();
    }, [bannerFilter, gachaBannerFilter, rarityFilter, isRateUpFilter, dateFrom, dateTo, page, perPage, baseRate, ratePoolFilter]);

    // Fetch Gacha Banners (2026 JP)
    const fetchBanners = async () => {
        try {
            const res = await fetch('/api/gacha/banners');
            const data = await res.json();
            setBanners(data || []);
        } catch (err) {
            console.error('Failed to load banners:', err);
        }
    };

    // Fetch Gacha Metadata (Characters & Support Cards from Gametora/Kamigame)
    const fetchMeta = async () => {
        try {
            const res = await fetch('/api/gacha/metadata');
            const data = await res.json();
            setGachaMeta(data);
        } catch (err) {
            console.error('Failed to load gacha metadata:', err);
        }
    };

    const fetchSyncStatus = async () => {
        try {
            const res = await fetch('/api/gacha/sync-status');
            if (res.ok) {
                const data = await res.json();
                setSyncStatus(data);
            }
        } catch (err) {
            console.error('Failed to load sync status:', err);
        }
    };

    useEffect(() => {
        fetchBanners();
        fetchMeta();
        fetchSyncStatus();
    }, []);

    const handleSyncCatalog = async (force = false) => {
        setSyncing(true);
        try {
            const res = await fetch('/api/gacha/sync-catalog', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ force }),
            });
            const data = await res.json();
            if (res.ok) {
                onNotify?.(data.message, data.is_up_to_date ? 'info' : 'success');
                // Refresh metadata & banners immediately without reloading the page
                await fetchMeta();
                await fetchBanners();
                if (data.stats) {
                    setSyncStatus(data.stats);
                } else {
                    await fetchSyncStatus();
                }
            } else {
                throw new Error(data.message || 'Gagal menyinkronkan data katalog.');
            }
        } catch (err) {
            onNotify?.(err.message || 'Gagal menyinkronkan data katalog GameTora', 'error');
        } finally {
            setSyncing(false);
        }
    };

    // Helper: Identify dummy / placeholder text
    const isPlaceholder = (name) => {
        if (!name || typeof name !== 'string') return true;
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return true;
        if (
            trimmed.startsWith('character / card') ||
            trimmed.startsWith('r item') ||
            trimmed.startsWith('sr item') ||
            trimmed.startsWith('ssr pick') ||
            trimmed === 'guaranteed sr' ||
            trimmed === 'featured rate-up' ||
            trimmed === 'r drop' ||
            trimmed === 'sr card' ||
            trimmed === 'item / character' ||
            /^character\s*\/?\s*card/i.test(trimmed)
        ) {
            return true;
        }
        return false;
    };

    // Helper: Verify if an item name is valid from the choices / pool
    const isItemInOptions = (name, pool = [], featured = []) => {
        if (isPlaceholder(name)) return false;
        const clean = name.trim().toLowerCase();
        if (!clean) return false;

        const allOptions = [...new Set([...(featured || []), ...(pool || [])])];
        if (allOptions.length === 0) {
            return clean.length >= 2;
        }

        // 1. Exact match (case insensitive)
        if (allOptions.some(opt => typeof opt === 'string' && opt.toLowerCase() === clean)) {
            return true;
        }

        // 2. Substring match if user typed partial name (min 3 chars)
        if (clean.length >= 3 && allOptions.some(opt => {
            if (typeof opt !== 'string') return false;
            const optLower = opt.toLowerCase();
            return optLower.includes(clean) || (clean.length >= 4 && clean.includes(optLower));
        })) {
            return true;
        }

        // 3. Base name match ignoring brackets [Title] and tags (Speed), etc.
        const cleanBase = clean.replace(/^(ssr|sr|r)\s+/i, '').replace(/\[.*?\]/, '').replace(/\(.*?\)/, '').trim();
        if (cleanBase.length >= 3 && allOptions.some(opt => {
            if (typeof opt !== 'string') return false;
            const optBase = opt.toLowerCase().replace(/^(ssr|sr|r)\s+/i, '').replace(/\[.*?\]/, '').replace(/\(.*?\)/, '').trim();
            return optBase === cleanBase || optBase.includes(cleanBase) || cleanBase.includes(optBase);
        })) {
            return true;
        }

        return false;
    };

    // Helper: Check if an item/card name is a featured rate-up on a banner
    const isItemRateUp = (itemName, banner) => {
        if (!itemName || !banner) return false;

        // Twinkle Collection tidak memiliki status rate-up (rate 3.0% terbagi rata ke 8 karakter B3)
        if (isTwinkleBanner(banner)) {
            return false;
        }

        const normalize = (str) => {
            if (!str || typeof str !== 'string') return '';
            return str
                .trim()
                .toLowerCase()
                .replace(/^(ssr|sr|r)\s+/i, '')
                .replace(/\s*\([^)]+\)\s*$/, '') // strip trailing (Speed), (Stamina), etc.
                .replace(/［/g, '[').replace(/］/g, ']')
                .trim();
        };

        const target = normalize(itemName);
        if (!target) return false;

        // Ignore placeholder text
        if (isPlaceholder(target)) {
            return false;
        }

        const featuredList = Array.isArray(banner.featured_items) ? banner.featured_items : [];
        const itemsToCheck = [...featuredList];
        if (itemsToCheck.length === 0 && banner.name) {
            const parts = banner.name.split(':');
            if (parts.length > 1) {
                itemsToCheck.push(parts[1].trim());
            }
        }

        return itemsToCheck.some(featured => {
            const feat = normalize(featured);
            if (!feat) return false;

            // 1. Exact match after normalization
            if (target === feat) return true;

            // 2. Substring match if length is sufficient
            if (feat.length >= 5 && target.includes(feat)) return true;
            if (target.length >= 5 && feat.includes(target)) return true;

            // 3. Bracket title match: e.g. [As if Guided]
            const targetBracket = target.match(/\[(.*?)\]/);
            const featBracket = feat.match(/\[(.*?)\]/);
            if (targetBracket && featBracket && targetBracket[1] === featBracket[1]) {
                const targetBase = target.replace(/\[.*?\]/, '').trim();
                const featBase = feat.replace(/\[.*?\]/, '').trim();
                if (targetBase === featBase || targetBase.includes(featBase) || featBase.includes(targetBase)) {
                    return true;
                }
            }

            return false;
        });
    };

    // Helper: Determine if a banner is a Select Pick Up (where trainer chooses custom rate-up cards)
    const isSelectPickupBanner = (banner) => {
        if (!banner) return false;
        return banner.category === 'select_rate_up' ||
               /select\s*pick\s*up/i.test(banner.name || '');
    };

    // Helper: Determine if a banner is a Twinkle Collection banner (exclusive 8 B3 characters with no rate-up)
    const isTwinkleBanner = (banner) => {
        if (!banner) return false;
        return banner.category === 'twinkle' ||
               /twinkle\s*collection/i.test(banner.name || '');
    };

    // Helper: Select banner and auto-configure banner type & suggestions
    const handleBannerChange = (bId, mode = 'multi') => {
        const banner = banners.find(b => String(b.id) === String(bId));
        if (mode === 'multi') {
            setSelectedBannerId(bId);
            if (banner) {
                setMultiBanner(banner.banner_type);
                // Automatically re-evaluate rate up for all existing slots against new banner
                setMultiPulls(prev => prev.map(p => ({
                    ...p,
                    is_rate_up: Boolean(isItemRateUp(p.item_name, banner)),
                })));
            } else {
                setMultiPulls(prev => prev.map(p => ({
                    ...p,
                    is_rate_up: false,
                })));
            }
        } else {
            setSingleBannerId(bId);
            if (banner) {
                setSingleForm(prev => ({
                    ...prev,
                    banner_type: banner.banner_type,
                    gacha_banner_id: bId,
                    is_rate_up: Boolean(isItemRateUp(prev.item_name, banner)),
                }));
            } else {
                setSingleForm(prev => ({ ...prev, gacha_banner_id: '', is_rate_up: false }));
            }
        }
    };

    // Helper: Quick apply featured item from banner to slot
    const handleApplyFeaturedToSlot = (itemName, slotIndex = null) => {
        let autoRarity = 'SSR';
        if (gachaMeta.character_rarities && gachaMeta.character_rarities[itemName]) {
            autoRarity = gachaMeta.character_rarities[itemName];
        } else if (itemName.startsWith('SR ')) {
            autoRarity = 'SR';
        } else if (itemName.startsWith('R ')) {
            autoRarity = 'R';
        }

        const bannerIdToUse = (slotIndex !== null || pullMode !== 'single') ? selectedBannerId : singleBannerId;
        const currentBanner = banners.find(b => String(b.id) === String(bannerIdToUse));
        const autoRateUp = isItemRateUp(itemName, currentBanner);

        if (slotIndex !== null) {
            setMultiPulls(prev => prev.map((p, i) => i === slotIndex ? {
                ...p,
                item_name: itemName,
                rarity: autoRarity,
                is_rate_up: Boolean(autoRateUp),
            } : p));
            setValidationErrors(prev => prev.filter(num => num !== (slotIndex + 1)));
        } else {
            // Find first slot that is empty or has placeholder name; if all filled, fill last slot
            let fillIdx = -1;
            setMultiPulls(prev => {
                const targetIdx = prev.findIndex(p => !p.item_name || isPlaceholder(p.item_name));
                fillIdx = targetIdx !== -1 ? targetIdx : (prev.length - 1);
                return prev.map((p, i) => i === fillIdx ? {
                    ...p,
                    item_name: itemName,
                    rarity: autoRarity,
                    is_rate_up: Boolean(autoRateUp),
                } : p);
            });
            if (fillIdx !== -1) {
                setValidationErrors(prev => prev.filter(num => num !== (fillIdx + 1)));
            }
        }
    };

    // Helper: Category badge styling for 2026 JP banners
    const getCategoryBadge = (category) => {
        switch (category) {
            case 'anniversary':
                return { label: 'Anniversary 4.5%', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' };
            case 'premium':
                return { label: 'Premium 4.5%', color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' };
            case 'scenario_release':
                return { label: 'Scenario Release', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' };
            case 'twinkle':
                return { label: 'Twinkle', color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800' };
            case 'select_rate_up':
                return { label: 'Select Pick Up', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' };
            default:
                return { label: 'Standard', color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
        }
    };

    // Helper: Select an item from autocomplete or directory
    const handleSelectItem = (name) => {
        let rarity = singleForm.rarity;
        const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
        const isTwinkle = isTwinkleBanner(currentBanner);
        const isFeaturedTwinkle = isTwinkle && Array.isArray(currentBanner?.featured_items) && currentBanner.featured_items.includes(name);

        if (isFeaturedTwinkle) {
            rarity = 'SSR';
        } else if (gachaMeta.character_rarities && gachaMeta.character_rarities[name]) {
            rarity = gachaMeta.character_rarities[name];
        } else if (name.startsWith('SSR ')) {
            rarity = 'SSR';
        } else if (name.startsWith('SR ')) {
            rarity = 'SR';
        } else if (name.startsWith('R ')) {
            rarity = 'R';
        }

        const autoRateUp = isTwinkle ? false : isItemRateUp(name, currentBanner);

        setSingleForm(prev => ({
            ...prev,
            item_name: name,
            rarity: rarity,
            is_rate_up: Boolean(autoRateUp),
        }));
        setShowSuggestions(false);
    };

    // Current Pool based on banner type & Twinkle Collection filter
    const currentSingleBanner = banners.find(b => String(b.id) === String(singleBannerId));
    const currentPool = useMemo(() => {
        if (isTwinkleBanner(currentSingleBanner) && Array.isArray(currentSingleBanner?.featured_items) && currentSingleBanner.featured_items.length > 0) {
            const twinkleFeatured = currentSingleBanner.featured_items.filter(c => typeof c === 'string' ? c.includes('[') : true);
            const allChars = (gachaMeta.characters || []).filter(c => typeof c === 'string' ? c.includes('[') : true);
            const b1AndB2Chars = allChars.filter(charName => {
                const r = (gachaMeta.character_rarities && gachaMeta.character_rarities[charName])
                    || (charName.startsWith('SR ') ? 'SR' : charName.startsWith('R ') ? 'R' : null);
                return r === 'SR' || r === 'R';
            });
            return Array.from(new Set([...twinkleFeatured, ...b1AndB2Chars]));
        }
        return singleForm.banner_type === 'character'
            ? (gachaMeta.characters || []).filter(c => typeof c === 'string' ? c.includes('[') : true)
            : (gachaMeta.support_cards || []);
    }, [singleForm.banner_type, singleBannerId, banners, gachaMeta, currentSingleBanner]);

    // Handle Search with debounce or submit
    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchPulls();
    };

    // Single Pull Submit
    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!singleBannerId) {
            setSingleBannerError(true);
            onNotify?.('Kolom Banner JP 2026 wajib dipilih! Tarikan tanpa banner khusus / custom tidak dapat diinput.', 'error');
            return;
        }

        const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
        const isTwinkle = isTwinkleBanner(currentBanner);
        const featured = (currentBanner && Array.isArray(currentBanner.featured_items) ? currentBanner.featured_items : [])
            .filter(c => singleForm.banner_type === 'character' ? (typeof c === 'string' ? c.includes('[') : true) : true);
        const pool = singleForm.banner_type === 'character' 
            ? (gachaMeta.characters || []).filter(c => typeof c === 'string' ? c.includes('[') : true) 
            : (gachaMeta.support_cards || []);

        const name = (singleForm.item_name || '').trim();
        if (!name || isPlaceholder(name)) {
            onNotify?.('Harap pilih nama karakter / kartu dari pilihan yang ada!', 'error');
            return;
        }

        if (isTwinkle && singleForm.rarity === 'SSR') {
            if (!isItemInOptions(name, [], featured)) {
                onNotify?.('Pada Twinkle Collection Gacha, karakter B3 (SSR) harus berasal dari 8 karakter lineup Twinkle Collection yang dipilih!', 'error');
                return;
            }
        } else if (!isItemInOptions(name, pool, featured)) {
            onNotify?.(`"${name}" tidak ditemukan dalam pilihan karakter / kartu yang ada!`, 'error');
            return;
        }

        if (!isTwinkle && singleForm.is_rate_up && !isItemRateUp(name, currentBanner)) {
            onNotify?.(`"${name}" bukan merupakan pilihan rate-up pada banner ini!`, 'error');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...singleForm,
                item_name: name,
                gacha_banner_id: parseInt(singleBannerId, 10),
                is_rate_up: isTwinkle ? false : Boolean(singleForm.is_rate_up),
            };
            const res = await fetch('/api/gacha/pulls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to record pull');

            onNotify?.(`Pull recorded! Current pity: ${result.data.pity_count_at_pull}`, 'success');
            setSingleForm(prev => ({ ...prev, item_name: '' }));
            setSingleBannerError(false);
            fetchStats();
            fetchPulls();
        } catch (err) {
            onNotify?.(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Batch Multi / Custom-Ticket Submit
    const handleMultiSubmit = async (e) => {
        e.preventDefault();

        if (!selectedBannerId) {
            setBannerError(true);
            onNotify?.('Kolom Banner JP 2026 wajib dipilih! Tarikan tanpa banner khusus / custom tidak dapat diinput.', 'error');
            return;
        }

        const currentBanner = banners.find(b => String(b.id) === String(selectedBannerId));
        const isTwinkle = isTwinkleBanner(currentBanner);
        const featured = (currentBanner && Array.isArray(currentBanner.featured_items) ? currentBanner.featured_items : [])
            .filter(c => multiBanner === 'character' ? (typeof c === 'string' ? c.includes('[') : true) : true);
        const pool = multiBanner === 'character' 
            ? (gachaMeta.characters || []).filter(c => typeof c === 'string' ? c.includes('[') : true) 
            : (gachaMeta.support_cards || []);

        const invalidSlots = [];
        const invalidTwinkleSsrSlots = [];
        multiPulls.forEach((p, idx) => {
            const name = (p.item_name || '').trim();
            if (!name || isPlaceholder(name)) {
                invalidSlots.push(idx + 1);
                return;
            }
            if (isTwinkle && p.rarity === 'SSR') {
                if (!isItemInOptions(name, [], featured)) {
                    invalidTwinkleSsrSlots.push(idx + 1);
                    return;
                }
            } else if (!isItemInOptions(name, pool, featured)) {
                invalidSlots.push(idx + 1);
                return;
            }
        });

        if (invalidTwinkleSsrSlots.length > 0) {
            setValidationErrors(invalidTwinkleSsrSlots);
            onNotify?.(
                `Karakter B3 (SSR) pada slot #${invalidTwinkleSsrSlots.join(', #')} harus berasal dari 8 karakter lineup Twinkle Collection yang dipilih!`,
                'error'
            );
            return;
        }

        if (invalidSlots.length > 0) {
            setValidationErrors(invalidSlots);
            onNotify?.(
                `Karakter / kartu pada slot #${invalidSlots.join(', #')} harus dipilih dari pilihan yang ada!`,
                'error'
            );
            return;
        }

        const invalidRateUpSlots = [];
        if (!isTwinkle) {
            multiPulls.forEach((p, idx) => {
                if (p.is_rate_up && !isItemRateUp(p.item_name, currentBanner)) {
                    invalidRateUpSlots.push(idx + 1);
                }
            });
        }

        if (invalidRateUpSlots.length > 0) {
            onNotify?.(
                `Kartu pada slot #${invalidRateUpSlots.join(', #')} bukan merupakan pilihan rate-up pada banner ini! Harap matikan centang UP atau pilih kartu rate-up yang valid.`,
                'error'
            );
            return;
        }

        setValidationErrors([]);
        setSubmitting(true);
        try {
            const actualCount = multiPulls.length;
            const isFullMulti10 = pullMode === 'multi_10' && actualCount === 10;
            const payload = {
                banner_type: multiBanner,
                gacha_banner_id: parseInt(selectedBannerId, 10),
                pull_type: isFullMulti10 ? 'multi_10' : 'custom_ticket',
                pulled_at: multiPulledAt || todayDate,
                pulls: multiPulls.map(p => ({
                    item_name: p.item_name.trim(),
                    rarity: p.rarity,
                    is_rate_up: isTwinkle ? false : Boolean(p.is_rate_up),
                })),
            };

            const res = await fetch('/api/gacha/pulls/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to record pulls');

            onNotify?.(`${actualCount}x Pull recorded successfully!`, 'success');
            setMultiPulls(makeDefaultPulls(pullMode === 'multi_10' ? 10 : ticketCount));
            setValidationErrors([]);
            setBannerError(false);
            fetchStats();
            fetchPulls();
        } catch (err) {
            onNotify?.(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Reset Pity / Claim Spark
    const handleResetPity = async (bannerType, gachaBannerId = null, bannerName = null) => {
        const displayName = bannerName || (bannerType === 'support_card' ? 'Support Card' : 'Character');
        if (!window.confirm(`Are you sure you want to reset Pity / Claim Spark for ${displayName}? This will reset the pity counter to 0.`)) {
            return;
        }

        try {
            const res = await fetch('/api/gacha/reset-pity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ banner_type: bannerType, gacha_banner_id: gachaBannerId }),
            });
            const result = await res.json();
            onNotify?.(result.message, 'info');
            fetchStats();
            fetchPulls();
        } catch (err) {
            onNotify?.('Failed to reset pity', 'error');
        }
    };

    // Delete Pull
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this pull record?')) return;
        try {
            const res = await fetch(`/api/gacha/pulls/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' },
            });
            if (res.ok) {
                onNotify?.('Pull record removed', 'info');
                fetchStats();
                fetchPulls();
            }
        } catch (err) {
            onNotify?.('Failed to delete pull', 'error');
        }
    };

    // Helper for quick fill presets (adapts to current ticket count)
    const setPresetRarities = (pattern) => {
        const count = multiPulls.length;
        const last = count - 1;
        const banner = banners.find(b => String(b.id) === String(selectedBannerId));
        const feat1 = banner?.featured_items?.[0] || null;
        const feat2 = banner?.featured_items?.[1] || null;

        if (pattern === 'min') {
            setMultiPulls(prev => prev.map((item, idx) => ({
                ...item,
                rarity: idx === last ? 'SR' : 'R',
                item_name: isPlaceholder(item.item_name) ? '' : item.item_name,
                is_rate_up: Boolean(isItemRateUp(item.item_name, banner)),
            })));
        } else if (pattern === 'ssr1') {
            setMultiPulls(prev => prev.map((item, idx) => {
                const isSSR = idx === last;
                const isSR = idx === last - 1 && count >= 2;
                const itemName = isSSR && feat1 ? feat1 : (isPlaceholder(item.item_name) ? '' : item.item_name);
                return {
                    ...item,
                    rarity: isSSR ? 'SSR' : isSR ? 'SR' : 'R',
                    item_name: itemName,
                    is_rate_up: Boolean(isItemRateUp(itemName, banner)),
                };
            }));
            if (feat1) {
                setValidationErrors(prev => prev.filter(num => num !== count));
            }
        } else if (pattern === 'ssr2') {
            setMultiPulls(prev => prev.map((item, idx) => {
                const isSSR1 = idx === last;
                const isSSR2 = idx === last - 1 && count >= 2;
                const isSR = idx === last - 2 && count >= 3;
                let itemName = isPlaceholder(item.item_name) ? '' : item.item_name;
                if (isSSR1 && feat1) itemName = feat1;
                else if (isSSR2 && feat2) itemName = feat2;
                else if (isSSR2 && feat1) itemName = feat1;

                return {
                    ...item,
                    rarity: (isSSR1 || isSSR2) ? 'SSR' : isSR ? 'SR' : 'R',
                    item_name: itemName,
                    is_rate_up: Boolean(isItemRateUp(itemName, banner)),
                };
            }));
            if (feat1) {
                setValidationErrors(prev => prev.filter(num => num !== count && num !== (count - 1)));
            }
        } else if (pattern === 'all_r') {
            setMultiPulls(prev => prev.map((item) => ({
                ...item,
                rarity: 'R',
                item_name: isPlaceholder(item.item_name) ? '' : item.item_name,
                is_rate_up: false,
            })));
        }
    };

    // Handle ticket count change (resizes the pull array)
    const handleTicketCountChange = (newCount) => {
        const clamped = Math.max(1, Math.min(10, parseInt(newCount, 10) || 1));
        setTicketCount(clamped);
        setMultiPulls(prev => {
            if (clamped > prev.length) {
                // Add new slots with empty string
                const extra = Array.from({ length: clamped - prev.length }, () => ({
                    item_name: '',
                    rarity: 'R',
                    is_rate_up: false,
                }));
                return [...prev, ...extra];
            }
            // Trim excess
            return prev.slice(0, clamped);
        });
        setValidationErrors(prev => prev.filter(num => num <= clamped));
    };

    const currentPity = stats?.active_pity ?? 0;
    const pityPercent = Math.min(100, Math.round((currentPity / 200) * 100));

    const currentMultiBanner = banners.find(b => String(b.id) === String(selectedBannerId));

    const renderBannerOptions = (typeFilter = null) => {
        const filtered = typeFilter ? banners.filter(b => b.banner_type === typeFilter) : banners;
        const anni = filtered.filter(b => b.category === 'anniversary' || b.category === 'scenario_release');
        const twinkle = filtered.filter(b => b.category === 'twinkle');
        const selectUp = typeFilter === 'character' ? [] : filtered.filter(b => b.category === 'select_rate_up' && b.banner_type !== 'character');
        const standard = filtered.filter(b => b.category === 'standard');

        return (
            <>
                <option value="">-- Pilih Banner JP 2026 (Wajib) --</option>
                {anni.length > 0 && (
                    <optgroup label="🌟 Anniversary & Skenario Baru 2026">
                        {anni.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name} ({b.start_date ? b.start_date.slice(5) : ''})
                            </option>
                        ))}
                    </optgroup>
                )}
                {twinkle.length > 0 && (
                    <optgroup label="💫 Twinkle Collection 2026">
                        {twinkle.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name} ({b.start_date ? b.start_date.slice(5) : ''})
                            </option>
                        ))}
                    </optgroup>
                )}
                {selectUp.length > 0 && (
                    <optgroup label="🎯 Select Pick Up 2026">
                        {selectUp.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name} ({b.start_date ? b.start_date.slice(5) : ''})
                            </option>
                        ))}
                    </optgroup>
                )}
                {standard.length > 0 && (
                    <optgroup label="🎴 Standard Gacha 2026">
                        {standard.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name} ({b.start_date ? b.start_date.slice(5) : ''})
                            </option>
                        ))}
                    </optgroup>
                )}
            </>
        );
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header & Pity Spark Hero */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-400/40 text-xs font-bold text-amber-200 mb-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Hoki Gacha & Penukaran Pity</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black">Gacha Pull Tracker</h1>
                        <p className="text-amber-100 text-sm mt-1 max-w-xl">
                            Catat tarikan tunggal dan 10x multi-pull, pantau progres spark menuju 200 tarikan, dan verifikasi rasio perolehan SSR aktual Anda.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/25 border border-white/20 text-xs font-semibold text-amber-200">
                                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                                <span>GameTora JP: {gachaMeta.characters?.length || 0} Karakter • {gachaMeta.support_cards?.length || 0} Kartu</span>
                            </span>
                            <button
                                type="button"
                                disabled={syncing}
                                onClick={() => handleSyncCatalog(false)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 disabled:opacity-50 text-white text-xs font-bold border border-white/30 transition cursor-pointer"
                                title="Sinkronkan pembaruan karakter dan support card dari GameTora"
                            >
                                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                                <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Spark Pity Widget */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[260px] text-right">
                        <div className="text-xs text-amber-200 font-bold uppercase tracking-wider flex items-center justify-between gap-2">
                            <span className="truncate max-w-[160px]" title={stats?.active_banner_name || 'Penghitung Pity Aktif'}>
                                {stats?.active_banner_name ? stats.active_banner_name.replace('Pretty Derby Gacha', '').trim() : 'Pity Aktif'}
                            </span>
                            <span className="text-amber-300 font-mono font-black shrink-0">{currentPity} / 200</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-3 mt-2 overflow-hidden p-0.5">
                            <div
                                className="h-full bg-gradient-to-r from-amber-300 via-yellow-200 to-white rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${pityPercent}%` }}
                            ></div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 text-xs">
                            <span className="text-amber-100 font-medium">
                                {200 - currentPity > 0 ? `${200 - currentPity} to spark` : 'Spark ready!'}
                            </span>
                            <button
                                onClick={() => handleResetPity(
                                    bannerFilter === 'support_card' ? 'support_card' : 'character',
                                    stats?.active_banner_id || (gachaBannerFilter !== 'all' ? gachaBannerFilter : null),
                                    stats?.active_banner_name
                                )}
                                className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-900/60 hover:bg-amber-900 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-400/30 transition-colors cursor-pointer"
                                title="Reset pity after spark claim"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset / Spark</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Navigation Tabs: Riwayat & Catat Tarikan vs Analisis Luck & Simulator */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveMainTab('history')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        activeMainTab === 'history'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Riwayat & Catat Tarikan</span>
                    {stats?.total_pulls > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeMainTab === 'history' ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                            {stats.total_pulls}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveMainTab('simulator')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        activeMainTab === 'simulator'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
                    }`}
                >
                    <Dice5 className="w-4 h-4 text-amber-500" />
                    <span>Analisis Luck & Simulator Probabilitas</span>
                    {stats?.luck_analysis?.overall?.luck_tier && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            {stats.luck_analysis.overall.luck_tier.name} ({stats.luck_analysis.overall.percentile}%)
                        </span>
                    )}
                </button>
            </div>

            {/* TAB CONTENT 1: PROBABILITY & BINOMIAL LUCK SIMULATOR */}
            {activeMainTab === 'simulator' && (
                <GachaProbabilitySimulator stats={stats} onNotify={onNotify} />
            )}

            {/* TAB CONTENT 2: PULL HISTORY, FORMS, & TABLES */}
            {activeMainTab === 'history' && (
                <>
                {/* Rate Pool Filter Tabs (Standard 3% vs Boosted 4.5% Separation) */}
            {stats && (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => {
                                    setRatePoolFilter('all');
                                    setBaseRate?.(3.0);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    ratePoolFilter === 'all'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>Semua Gacha</span>
                                {stats.pools?.all && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                                        {stats.pools.all.total_pulls}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setRatePoolFilter('standard');
                                    setBaseRate?.(3.0);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    ratePoolFilter === 'standard'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>Standar (3.0%)</span>
                                {stats.pools?.standard && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                                        ratePoolFilter === 'standard' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    }`}>
                                        {stats.pools.standard.total_pulls} pulls ({stats.pools.standard.ssr_rate}%)
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setRatePoolFilter('boosted');
                                    setBaseRate?.(4.5);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    ratePoolFilter === 'boosted'
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <span className="flex items-center gap-1">🔥 Premium (4.5%)</span>
                                {stats.pools?.boosted && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                                        ratePoolFilter === 'boosted' ? 'bg-amber-700 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                    }`}>
                                        {stats.pools.boosted.total_pulls} pulls ({stats.pools.boosted.ssr_rate}%)
                                    </span>
                                )}
                            </button>
                        </div>

                        {ratePoolFilter !== 'all' && (
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                                Pool aktif: {ratePoolFilter === 'standard' ? 'Tarikan banner Standar (Base 3.0%)' : 'Tarikan banner Premium (Base 4.5% Anniv, Movie & Special Debut)'}
                            </span>
                        )}
                    </div>

                    {/* Metric Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Tarikan</span>
                            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                                {stats.total_pulls}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                                {ratePoolFilter === 'all' ? 'Semua pool gabungan' : (ratePoolFilter === 'standard' ? 'Khusus pool 3.0%' : 'Khusus pool 4.5%')}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                            <span className="text-xs font-bold text-slate-500 uppercase">SSR Didapat</span>
                            <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                                {stats.ssr_count}
                            </div>
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-1 block">
                                {stats.rate_up_count ? `${stats.rate_up_count} Rate-Up` : 'Termasuk Rate-Off'}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                            <span className="text-xs font-bold text-slate-500 uppercase">Rate SSR Aktual</span>
                            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                                {stats.ssr_rate}%
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                                vs patokan {stats.base_rate}%
                            </span>
                        </div>
                        <div
                            onClick={() => setActiveMainTab('simulator')}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors group"
                            title="Klik untuk membuka Analisis Luck Percentile & Simulator Probabilitas"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                    Hoki vs Patokan ({stats.base_rate}%)
                                </span>
                                <Dice5 className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
                            </div>
                            <div className={`text-2xl font-black font-mono mt-1 ${stats.luck_diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {stats.luck_diff >= 0 ? `+${stats.luck_diff}%` : `${stats.luck_diff}%`}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                                <span className={`font-bold ${stats.luck_diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {stats.luck_diff >= 0 ? 'Di atas patokan (Hoki)' : 'Di bawah patokan'}
                                </span>
                                <span className="font-bold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-0.5">
                                    <span>Simulator</span>
                                    <span>&rarr;</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Per-Banner Breakdown Card (When pulls have been recorded per banner) */}
            {stats?.banner_breakdown?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Rekap Gacha per Banner (Server Jepang 2026)
                            </h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                            {stats.banner_breakdown.length} banner tercatat
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.banner_breakdown.map((bb) => (
                            <div
                                key={bb.id}
                                className={`p-3.5 rounded-2xl border transition-all ${
                                    bb.is_boosted
                                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-xs'
                                        : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                                        {bb.name}
                                    </span>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50">
                                            {bb.category.replace('_', ' ')}
                                        </span>
                                        {bb.is_boosted ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white shadow-2xs">
                                                Rate: 4.5% Boost
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                Base: 3.0%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                        <span className="text-amber-700 dark:text-amber-400">Pity / Spark:</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {bb.current_pity ?? bb.pulls_count} / 200
                                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                                                ({bb.pulls_to_spark ?? Math.max(0, 200 - (bb.current_pity ?? bb.pulls_count))} left)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, Math.round(((bb.current_pity ?? bb.pulls_count) / 200) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-bold">Total Pull</span>
                                            <span className="font-mono font-black text-slate-800 dark:text-slate-200">{bb.pulls_count}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-amber-600 block font-bold">SSR</span>
                                            <span className="font-mono font-black text-amber-600">{bb.ssr_count}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="text-[10px] text-slate-400 block font-bold">SSR Rate</span>
                                            <span className={`text-[10px] font-extrabold ${bb.luck_diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ({bb.luck_diff >= 0 ? `+${bb.luck_diff}%` : `${bb.luck_diff}%`})
                                            </span>
                                        </div>
                                        <span className="font-mono font-black text-slate-900 dark:text-slate-100">{bb.ssr_rate}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GameTora Catalog Status & Quick Sync Bar */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
                        <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-600">Database GameTora JP</span>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs text-slate-500 font-medium">
                                {syncStatus?.last_synced_at
                                    ? `Terakhir disinkronkan: ${new Date(syncStatus.last_synced_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
                                    : 'Katalog Standar'}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                            {gachaMeta.characters?.length || 0} Karakter (Semua Varian & Kostum) &bull; {gachaMeta.support_cards?.length || 0} Support Cards &bull; {banners.length || 0} Banner Gacha 2026
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { setShowModal(true); setModalSearch(''); fetchSyncStatus(); }}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span>Buka Katalog Game</span>
                    </button>

                    <button
                        type="button"
                        disabled={syncing}
                        onClick={() => handleSyncCatalog(false)}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-sm shadow-amber-600/30 transition cursor-pointer"
                        title="Tarik data varian karakter dan support card terbaru dari GameTora server Jepang"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Menyinkronkan...' : '🔄 Sinkronkan GameTora'}</span>
                    </button>

                    <button
                        type="button"
                        disabled={syncing}
                        onClick={() => handleSyncCatalog(true)}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 active:scale-95 disabled:opacity-50 text-xs transition cursor-pointer"
                        title="Paksa unduh ulang penuh dari GameTora (Force Refresh)"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Pull Logging Form with Tabs (Single vs Multi-10 Preset) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-amber-600" />
                            <span>Log Gacha Pulls</span>
                        </h2>
                        <p className="text-xs text-slate-500">Catat gacha satu per satu atau gunakan mode tiket kustom (1-10 tiket sekaligus)</p>
                    </div>

                    {/* Mode Toggle & Quick Sync */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            disabled={syncing}
                            onClick={() => handleSyncCatalog(false)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            title="Tarik pembaruan dari GameTora"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowQuick10Modal(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition-all cursor-pointer"
                            title="Buka dialog modal input instan 10-Pull"
                        >
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>⚡ Quick 10-Pull</span>
                        </button>

                        <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => { setPullMode('custom'); }}
                                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                    pullMode === 'custom'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                🎫 Tiket Kustom (1-10)
                            </button>
                            <button
                                type="button"
                                onClick={() => { setPullMode('multi_10'); handleTicketCountChange(10); }}
                                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                    pullMode === 'multi_10'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                ⚡ 10x Multi-Pull
                            </button>
                            <button
                                type="button"
                                onClick={() => setPullMode('single')}
                                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                    pullMode === 'single'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Single Pull
                            </button>
                        </div>
                    </div>
                </div>

                {(pullMode === 'multi_10' || pullMode === 'custom') ? (
                    /* Multi / Custom Ticket Mode */
                    <form onSubmit={handleMultiSubmit} className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-700">Banner:</label>
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setMultiBanner('character')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                                multiBanner === 'character'
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-white text-slate-700 border-slate-300'
                                            }`}
                                        >
                                            Character
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMultiBanner('support_card')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                                multiBanner === 'support_card'
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-white text-slate-700 border-slate-300'
                                            }`}
                                        >
                                            Support Card
                                        </button>
                                    </div>
                                </div>

                                {/* Ticket Count Selector (only in custom mode) */}
                                {pullMode === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-slate-700">Jumlah Tiket:</label>
                                        <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl px-2 py-1">
                                            <button
                                                type="button"
                                                onClick={() => handleTicketCountChange(ticketCount - 1)}
                                                disabled={ticketCount <= 1}
                                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer disabled:opacity-30"
                                            >−</button>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={ticketCount}
                                                onChange={(e) => handleTicketCountChange(e.target.value)}
                                                className="w-10 text-center text-sm font-mono font-black text-amber-800 bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleTicketCountChange(ticketCount + 1)}
                                                disabled={ticketCount >= 10}
                                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer disabled:opacity-30"
                                            >+</button>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium">tiket</span>
                                    </div>
                                )}

                                {/* 2026 JP Banner Selection */}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                                        <span>Banner JP 2026:</span>
                                        <span className="text-rose-500 font-black">*</span>
                                    </label>
                                    <select
                                        value={selectedBannerId}
                                        onChange={(e) => {
                                            setBannerError(false);
                                            handleBannerChange(e.target.value, 'multi');
                                        }}
                                        className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none max-w-xs truncate transition-all ${
                                            bannerError || !selectedBannerId
                                                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-800 dark:text-rose-300 focus:ring-2 focus:ring-rose-500'
                                                : 'bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500'
                                        }`}
                                    >
                                        {renderBannerOptions(multiBanner)}
                                    </select>
                                    {(!selectedBannerId || bannerError) && (
                                        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                                            * Wajib dipilih
                                        </span>
                                    )}
                                </div>

                                {/* Pull Date */}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-700">Tanggal:</label>
                                    <input
                                        type="date"
                                        max={todayDate}
                                        value={multiPulledAt}
                                        onChange={(e) => setMultiPulledAt(e.target.value)}
                                        className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Quick Fill:</span>
                                <button
                                    type="button"
                                    onClick={() => setPresetRarities('all_r')}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 cursor-pointer"
                                >
                                    All R
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetRarities('min')}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 cursor-pointer"
                                >
                                    {multiPulls.length - 1} R + 1 SR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetRarities('ssr1')}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 dark:bg-amber-950/80 dark:hover:bg-amber-900 dark:text-amber-300 dark:border dark:border-amber-700/60 cursor-pointer"
                                >
                                    1 SSR + 1 SR
                                </button>
                                {multiPulls.length >= 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setPresetRarities('ssr2')}
                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-200 hover:bg-rose-300 text-rose-900 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 dark:border dark:border-rose-700/60 cursor-pointer"
                                    >
                                        2 SSR (Jackpot)
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Select Pick Up Mode Notice & Featured Chips for Batch Pull */}
                        {(() => {
                            const currentBanner = banners.find(b => String(b.id) === String(selectedBannerId));
                            if (!currentBanner) return null;
                            const isSelect = isSelectPickupBanner(currentBanner);
                            const isTwinkle = isTwinkleBanner(currentBanner);
                            const hasFeatured = currentBanner.featured_items && currentBanner.featured_items.length > 0;

                            return (
                                <div className="space-y-2">
                                    {isSelect && (
                                        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-2xl border border-amber-300 dark:border-amber-700/80 shadow-2xs">
                                            <div className="flex items-start gap-2.5">
                                                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                                                            Mode Select Pick Up (Pilihan 2 dari 10 SSR)
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950">
                                                            Manual UP Aktif
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-medium text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                                                        Pada banner Select Pick Up, Anda bebas menentukan 2 kartu SSR pilihan di dalam game. Tombol centang <strong className="font-bold underline">UP</strong> di samping tiap baris slot kini dapat diklik/diubah secara manual untuk menandai kartu yang Anda jadikan rate-up.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isTwinkle && hasFeatured && (
                                        <div className="p-3.5 bg-gradient-to-r from-sky-50/90 via-indigo-50/80 to-sky-50/90 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-sky-950/40 rounded-2xl border border-sky-300 dark:border-sky-800/80 shadow-2xs space-y-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                                                    <span className="text-xs font-black text-sky-950 dark:text-sky-200">
                                                        Lineup Karakter B3 Twinkle Collection (8 Karakter • Rate Rata 0.375% per Karakter)
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-200 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700">
                                                        Tanpa Rate-Up / Rate-Off
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-sky-800/80 dark:text-sky-300/80 italic">
                                                    (Rate 3% terbagi rata ke 8 karakter • Bebas dari rate-off / spook)
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-200/60 dark:border-sky-800/60">
                                                {currentBanner.featured_items.map((item, fIdx) => (
                                                    <button
                                                        key={fIdx}
                                                        type="button"
                                                        onClick={() => handleApplyFeaturedToSlot(item)}
                                                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-600 text-sky-950 dark:text-sky-200 border border-sky-300 dark:border-sky-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                                        title="Klik untuk isi cepat ke slot pull (Otomatis B3 / SSR, tanpa Rate-Up)"
                                                    >
                                                        <span>+</span> {item}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!isTwinkle && hasFeatured && (
                                        <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                                ⭐ {isSelect ? 'Kandidat Pick Up:' : 'Featured Rate-Up:'}
                                            </span>
                                            {currentBanner.featured_items.map((item, fIdx) => (
                                                <button
                                                    key={fIdx}
                                                    type="button"
                                                    onClick={() => handleApplyFeaturedToSlot(item)}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-500 dark:hover:bg-amber-600 hover:text-white dark:hover:text-white text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                                    title="Klik untuk isi cepat ke slot pull (otomatis centang UP)"
                                                >
                                                    <span>+</span> {item}
                                                </button>
                                            ))}
                                            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 italic ml-auto">
                                                (Klik untuk isi cepat ke slot pull)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 10 Items Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {multiPulls.map((item, idx) => {
                                const currentBanner = banners.find(b => String(b.id) === String(selectedBannerId));
                                const isTwinkle = isTwinkleBanner(currentBanner);
                                const isInvalid = validationErrors.includes(idx + 1);
                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                                            isInvalid
                                                ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-200 dark:bg-rose-950/40 dark:border-rose-700'
                                                : item.rarity === 'SSR'
                                                    ? 'ssr-slot-rainbow border-rose-300 dark:border-pink-500/60 ring-1 ring-purple-300/40 dark:ring-purple-400/30'
                                                    : item.rarity === 'SR'
                                                        ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
                                                        : 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'
                                        }`}
                                    >
                                        <span className={`w-6 text-xs font-mono font-bold shrink-0 ${
                                            isInvalid
                                                ? 'text-rose-500'
                                                : item.rarity === 'SSR'
                                                    ? 'font-black bg-gradient-to-r from-pink-500 via-amber-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-0.5'
                                                    : item.rarity === 'SR'
                                                        ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                                                        : 'text-slate-400'
                                        }`}>
                                            #{idx + 1}
                                        </span>

                                        <div className="flex-1 relative min-w-0">
                                            <input
                                                type="text"
                                                list="gacha-multi-suggestions"
                                                value={item.item_name}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    let autoRarity = item.rarity;
                                                    if (gachaMeta.character_rarities && gachaMeta.character_rarities[val]) {
                                                        autoRarity = gachaMeta.character_rarities[val];
                                                    } else if (val.startsWith('SSR ')) {
                                                        autoRarity = 'SSR';
                                                    } else if (val.startsWith('SR ')) {
                                                        autoRarity = 'SR';
                                                    } else if (val.startsWith('R ')) {
                                                        autoRarity = 'R';
                                                    }
                                                    const autoRateUp = isItemRateUp(val, currentBanner);
                                                    setMultiPulls(prev => prev.map((p, i) => i === idx ? {
                                                        ...p,
                                                        item_name: val,
                                                        rarity: autoRarity,
                                                        is_rate_up: Boolean(autoRateUp),
                                                    } : p));
                                                    if (validationErrors.includes(idx + 1)) {
                                                        setValidationErrors(prev => prev.filter(n => n !== (idx + 1)));
                                                    }
                                                }}
                                                placeholder={isTwinkle ? `Pilih / ketik nama (B1/B2/B3) #${idx + 1}...` : `Pilih / ketik nama #${idx + 1}...`}
                                                className={`w-full px-3 py-1.5 pr-7 rounded-xl border text-xs font-medium focus:ring-2 focus:outline-none transition-colors ${
                                                    isInvalid
                                                        ? 'bg-white border-rose-400 text-rose-900 placeholder:text-rose-300 focus:ring-rose-500'
                                                        : item.rarity === 'SSR'
                                                            ? 'bg-white/95 dark:bg-slate-900/90 border-pink-300/80 dark:border-purple-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-pink-400'
                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-amber-500'
                                                }`}
                                            />
                                            {item.item_name && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMultiPulls(prev => prev.map((p, i) => i === idx ? { ...p, item_name: '', is_rate_up: false } : p));
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                                    title="Hapus pilihan"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {isInvalid && (
                                                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                                    * Wajib dipilih dari pilihan karakter/kartu
                                                </span>
                                            )}
                                        </div>

                                        {/* Rarity Selector (Read Only) */}
                                        <div
                                            className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 select-none pointer-events-none"
                                            title={`Rarity otomatis: ${item.rarity}`}
                                        >
                                            {['R', 'SR', 'SSR'].map((r) => (
                                                <span
                                                    key={r}
                                                    className={`px-2.5 py-1 text-[11px] font-bold ${
                                                        item.rarity === r
                                                            ? r === 'SSR'
                                                                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs'
                                                                : r === 'SR'
                                                                    ? 'bg-yellow-500 text-white shadow-xs'
                                                                    : 'bg-slate-600 text-white shadow-xs'
                                                            : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                                    }`}
                                                >
                                                    {r}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Rate Up Toggle: Interactive on Select Pick Up, read-only on standard banner, revoked on Twinkle */}
                                        {(() => {
                                            if (isTwinkle) {
                                                return (
                                                    <div
                                                        className="flex items-center justify-center text-[10px] font-bold px-2 py-1 rounded-lg select-none cursor-default shrink-0 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/80"
                                                        title="Tidak ada status Rate-Up pada Twinkle Collection (seluruh 8 karakter B3 memiliki rate sama 0.375% tanpa rate-off)"
                                                    >
                                                        <span>Pool B3</span>
                                                    </div>
                                                );
                                            }

                                            const isSelect = isSelectPickupBanner(currentBanner);
                                            if (isSelect) {
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMultiPulls(prev => prev.map((p, i) => {
                                                                if (i !== idx) return p;
                                                                if (!p.is_rate_up) {
                                                                    if (!isItemRateUp(p.item_name, currentBanner)) {
                                                                        onNotify?.(
                                                                            `"${p.item_name || `Slot #${idx + 1}`}" bukan merupakan pilihan kartu kandidat rate-up pada banner ${currentBanner?.name || ''}.`,
                                                                            'warning'
                                                                        );
                                                                        return p;
                                                                    }
                                                                    return { ...p, is_rate_up: true };
                                                                }
                                                                return { ...p, is_rate_up: false };
                                                            }));
                                                        }}
                                                        className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg select-none transition-all cursor-pointer shrink-0 border ${
                                                            item.is_rate_up
                                                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs ring-1 ring-amber-300/50'
                                                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300'
                                                        }`}
                                                        title="Klik untuk mengubah status Rate-Up manual (Pilihan Anda pada Select Pick Up)"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(item.is_rate_up)}
                                                            onChange={() => {}}
                                                            className="rounded text-amber-600 focus:ring-0 cursor-pointer pointer-events-none"
                                                        />
                                                        <span>UP</span>
                                                    </button>
                                                );
                                            }

                                            return (
                                                <div
                                                    className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-lg select-none cursor-default shrink-0 ${
                                                        item.is_rate_up
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60 shadow-2xs'
                                                            : 'text-slate-400 dark:text-slate-600 opacity-60'
                                                    }`}
                                                    title="Status Rate-Up otomatis terdeteksi dari banner (Read-only)"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.is_rate_up)}
                                                        readOnly
                                                        disabled
                                                        tabIndex={-1}
                                                        className="rounded text-amber-600 focus:ring-0 cursor-default opacity-80 pointer-events-none"
                                                    />
                                                    <span className={item.is_rate_up ? 'font-black text-amber-800 dark:text-amber-300' : ''}>UP</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Datalist for fast native browser suggestions in 10-pull */}
                        <datalist id="gacha-multi-suggestions">
                            {(() => {
                                const currentBanner = banners.find(b => String(b.id) === String(selectedBannerId));
                                if (isTwinkleBanner(currentBanner)) {
                                    const featured = (Array.isArray(currentBanner?.featured_items) ? currentBanner.featured_items : [])
                                        .filter(c => typeof c === 'string' ? c.includes('[') : true);
                                    const b1AndB2Chars = (gachaMeta.characters || [])
                                        .filter(c => typeof c === 'string' ? c.includes('[') : true)
                                        .filter(charName => {
                                            const r = (gachaMeta.character_rarities && gachaMeta.character_rarities[charName])
                                                || (charName.startsWith('SR ') ? 'SR' : charName.startsWith('R ') ? 'R' : null);
                                            return r === 'SR' || r === 'R';
                                        });
                                    const combined = Array.from(new Set([...featured, ...b1AndB2Chars]));
                                    return combined.map((opt) => (
                                        <option key={opt} value={opt} />
                                    ));
                                }
                                const featured = (currentBanner && Array.isArray(currentBanner.featured_items) ? currentBanner.featured_items : [])
                                    .filter(c => multiBanner === 'character' ? (typeof c === 'string' ? c.includes('[') : true) : true);
                                const pool = multiBanner === 'character' 
                                    ? (gachaMeta.characters || []).filter(c => typeof c === 'string' ? c.includes('[') : true) 
                                    : (gachaMeta.support_cards || []);
                                const combined = [...new Set([...featured, ...pool])];
                                return combined.map((opt) => (
                                    <option key={opt} value={opt} />
                                ));
                            })()}
                        </datalist>

                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pt-2">
                            {validationErrors.length > 0 && (
                                <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Pilih karakter / kartu untuk slot yang ditandai merah: #{validationErrors.join(', #')}</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="ml-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-md shadow-amber-400/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>
                                    {submitting
                                        ? `Recording ${multiPulls.length} Pulls...`
                                        : pullMode === 'multi_10'
                                            ? 'Log 10x Multi-Pull'
                                            : `Log ${multiPulls.length} Tiket Gacha`}
                                </span>
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Single Pull Mode with Autocomplete & Game Database Search */
                    <form onSubmit={handleSingleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 h-4 leading-4">Pool Type</label>
                                <select
                                    value={singleForm.banner_type}
                                    onChange={(e) => {
                                        setSingleForm({ ...singleForm, banner_type: e.target.value });
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                >
                                    <option value="character">Uma Musume</option>
                                    <option value="support_card">Support Card</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5 h-4 leading-4">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                        Banner JP 2026 <span className="text-rose-500 font-black">*</span>
                                    </label>
                                    {(!singleBannerId || singleBannerError) && (
                                        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 shrink-0">
                                            * Wajib dipilih
                                        </span>
                                    )}
                                </div>
                                <select
                                    value={singleBannerId}
                                    onChange={(e) => {
                                        setSingleBannerError(false);
                                        handleBannerChange(e.target.value, 'single');
                                    }}
                                    className={`w-full h-10 rounded-xl px-3 text-xs font-semibold focus:outline-none truncate transition-all ${
                                        singleBannerError || !singleBannerId
                                            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-800 dark:text-rose-300 focus:ring-2 focus:ring-rose-500'
                                            : 'bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500'
                                    }`}
                                >
                                    {renderBannerOptions(singleForm.banner_type)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 h-4 leading-4">Pull Type</label>
                                <select
                                    value={singleForm.pull_type}
                                    onChange={(e) => setSingleForm({ ...singleForm, pull_type: e.target.value })}
                                    className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                >
                                    <option value="single">Single (150 Carrots)</option>
                                    <option value="ticket">Gacha Ticket</option>
                                    <option value="custom_ticket">Custom Ticket</option>
                                    <option value="multi_10">Multi 10x (Single Entry)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 h-4 leading-4">Tanggal Gacha</label>
                                <input
                                    type="date"
                                    max={todayDate}
                                    value={singleForm.pulled_at}
                                    onChange={(e) => setSingleForm({ ...singleForm, pulled_at: e.target.value })}
                                    className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 h-4 leading-4">Rarity</label>
                                <div className="h-10 flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                                    {['R', 'SR', 'SSR'].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => {
                                                const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                                                const isSelect = isSelectPickupBanner(currentBanner);
                                                let nextUp = singleForm.is_rate_up;
                                                if (r === 'R' || (isSelect && r !== 'SSR')) {
                                                    nextUp = false;
                                                }
                                                setSingleForm(prev => ({ ...prev, rarity: r, is_rate_up: nextUp }));
                                            }}
                                            className={`flex-1 h-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                                                singleForm.rarity === r
                                                    ? r === 'SSR'
                                                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white'
                                                        : r === 'SR'
                                                            ? 'bg-yellow-500 text-white'
                                                            : 'bg-slate-700 text-white'
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 h-4 leading-4">
                                    {(() => {
                                        const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                                        return isTwinkleBanner(currentBanner) ? 'Pool & Aksi' : 'Status & Aksi';
                                    })()}
                                </label>
                                <div className="flex items-center gap-2 h-10">
                                    {/* Rate Up Toggle: Interactive on Select Pick Up, read-only on standard banner, muted on Twinkle */}
                                    {(() => {
                                        const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                                        const isTwinkle = isTwinkleBanner(currentBanner);
                                        const isSelect = isSelectPickupBanner(currentBanner);

                                        if (isTwinkle) {
                                            return (
                                                <div
                                                    className="h-10 px-2.5 rounded-xl select-none cursor-default bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex flex-col justify-center items-center leading-tight shrink-0"
                                                    title="Twinkle Collection: 8 Karakter B3 memiliki rate sama rata (0.375% per karakter) tanpa sistem rate-up/rate-off (spook)."
                                                >
                                                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-600 dark:text-sky-400">Pool B3</span>
                                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">(Tanpa UP)</span>
                                                </div>
                                            );
                                        }

                                        if (isSelect) {
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                                                        if (!singleForm.is_rate_up) {
                                                            if (!isItemRateUp(singleForm.item_name, currentBanner)) {
                                                                onNotify?.(
                                                                    `"${singleForm.item_name || 'Item ini'}" bukan merupakan pilihan kartu kandidat rate-up pada banner ${currentBanner?.name || ''}.`,
                                                                    'warning'
                                                                );
                                                                return;
                                                            }
                                                            setSingleForm(prev => ({ ...prev, is_rate_up: true }));
                                                        } else {
                                                            setSingleForm(prev => ({ ...prev, is_rate_up: false }));
                                                        }
                                                    }}
                                                    className={`h-10 px-3 rounded-xl select-none transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                                                        singleForm.is_rate_up
                                                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs ring-1 ring-amber-300/50'
                                                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300'
                                                    }`}
                                                    title="Klik untuk mengubah status Rate-Up manual (Pilihan Anda pada Select Pick Up)"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(singleForm.is_rate_up)}
                                                        onChange={() => {}}
                                                        className="rounded text-amber-600 focus:ring-0 cursor-pointer pointer-events-none"
                                                    />
                                                    <span className="text-xs font-bold">UP</span>
                                                </button>
                                            );
                                        }

                                        return (
                                            <div
                                                className={`h-10 px-3 rounded-xl select-none cursor-default border flex items-center gap-1.5 shrink-0 ${
                                                    singleForm.is_rate_up
                                                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60 shadow-2xs'
                                                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700/60 opacity-60'
                                                }`}
                                                title="Status Rate-Up otomatis terdeteksi dari banner (Read-only)"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(singleForm.is_rate_up)}
                                                    readOnly
                                                    disabled
                                                    tabIndex={-1}
                                                    className="rounded text-amber-600 focus:ring-0 cursor-default opacity-80 pointer-events-none"
                                                />
                                                <span className={`text-xs ${singleForm.is_rate_up ? 'font-black text-amber-800 dark:text-amber-300' : 'font-bold'}`}>UP</span>
                                            </div>
                                        );
                                    })()}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="h-10 flex-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-400/20 cursor-pointer disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {submitting ? 'Adding...' : 'Log Pull'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Select Pick Up Mode Notice & Featured Chips for Single Pull */}
                        {(() => {
                            const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                            if (!currentBanner) return null;
                            const isTwinkle = isTwinkleBanner(currentBanner);
                            const isSelect = isSelectPickupBanner(currentBanner);
                            const hasFeatured = currentBanner.featured_items && currentBanner.featured_items.length > 0;

                            return (
                                <div className="space-y-2">
                                    {isTwinkle && hasFeatured && (
                                        <div className="p-3 bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 shadow-2xs">
                                            <div className="flex items-start gap-2.5">
                                                <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400 mt-0.5 shrink-0" />
                                                <div className="space-y-1 w-full">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <span className="text-xs font-black text-sky-950 dark:text-sky-200">
                                                            Lineup Karakter B3 Twinkle Collection (8 Karakter • Rate Rata 0.375% per Karakter)
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-500 text-white">
                                                            Tanpa Rate-Up / Rate-Off
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-medium text-sky-900/80 dark:text-sky-300/80 leading-relaxed">
                                                        Seluruh 3% rate SSR terbagi rata ke 8 karakter B3 di bawah ini (tidak ada spook/rate-off). Klik tombol di bawah untuk mengisi form secara instan:
                                                    </p>
                                                    <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                                                        {currentBanner.featured_items.map((item, fIdx) => (
                                                            <button
                                                                key={fIdx}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleSelectItem(item);
                                                                    setSingleForm(prev => ({ ...prev, is_rate_up: false }));
                                                                }}
                                                                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                                                title={`Pilih ${item} (Tarikan SSR Twinkle Collection)`}
                                                            >
                                                                + {item}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isTwinkle && isSelect && (
                                        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-2xl border border-amber-300 dark:border-amber-700/80 shadow-2xs">
                                            <div className="flex items-start gap-2.5">
                                                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                                                            Mode Select Pick Up (Pilihan 2 dari 10 SSR)
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950">
                                                            Manual UP Aktif
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-medium text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                                                        Pada banner Select Pick Up, Anda bebas menentukan 2 kartu SSR pilihan di dalam game. Tombol <strong className="font-bold underline">UP</strong> dapat Anda klik/centang secara manual untuk menandai kartu yang Anda jadikan rate-up.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isTwinkle && hasFeatured && (
                                        <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs font-extrabold text-amber-900">
                                                ⭐ {isSelect ? 'Kandidat Pick Up:' : 'Featured Rate-Up:'}
                                            </span>
                                            {currentBanner.featured_items.map((item, fIdx) => (
                                                <button
                                                    key={fIdx}
                                                    type="button"
                                                    onClick={() => {
                                                        handleSelectItem(item);
                                                        setSingleForm(prev => ({ ...prev, is_rate_up: !isSelect }));
                                                    }}
                                                    className="px-2 py-0.5 bg-white hover:bg-amber-500 hover:text-white text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    + {item}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Item Name with Autocomplete, Directory modal, and Quick Chips */}
                        {(() => {
                            const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                            const isTwinkle = isTwinkleBanner(currentBanner);

                            return (
                                <div className="relative pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {isTwinkle
                                                ? (singleForm.rarity === 'SSR' ? 'Karakter B3 Twinkle Collection *' : 'Nama Uma Musume (B1/B2/B3) *')
                                                : singleForm.banner_type === 'character'
                                                    ? 'Uma Musume Name *'
                                                    : 'Support Card Name *'}
                                        </label>
                                        {!isTwinkle && (
                                            <button
                                                type="button"
                                                onClick={() => { setShowModal(true); setModalSearch(''); fetchSyncStatus(); }}
                                                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                                            >
                                                <Search className="w-3 h-3" />
                                                <span>Browse Game Database (Gametora / Kamigame) ({currentPool.length}+)</span>
                                            </button>
                                        )}
                                        {isTwinkle && (
                                            <span className="text-[11px] font-extrabold text-sky-700 dark:text-sky-400">
                                                Pool B3 Eksklusif 8 Karakter (0.375% per Uma) • Termasuk Pool B1/B2
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={singleForm.item_name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                let autoRarity = singleForm.rarity;
                                                const currentBanner = banners.find(b => String(b.id) === String(singleBannerId));
                                                const isFeaturedTwinkle = isTwinkle && Array.isArray(currentBanner?.featured_items) && currentBanner.featured_items.includes(val);

                                                if (isFeaturedTwinkle) {
                                                    autoRarity = 'SSR';
                                                } else if (gachaMeta.character_rarities && gachaMeta.character_rarities[val]) {
                                                    autoRarity = gachaMeta.character_rarities[val];
                                                } else if (val.startsWith('SSR ')) {
                                                    autoRarity = 'SSR';
                                                } else if (val.startsWith('SR ')) {
                                                    autoRarity = 'SR';
                                                } else if (val.startsWith('R ')) {
                                                    autoRarity = 'R';
                                                }
                                                const autoRateUp = isTwinkle ? false : isItemRateUp(val, currentBanner);
                                                setSingleForm(prev => ({
                                                    ...prev,
                                                    item_name: val,
                                                    rarity: autoRarity,
                                                    is_rate_up: Boolean(autoRateUp),
                                                }));
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            placeholder={
                                                isTwinkle
                                                    ? (singleForm.rarity === 'SSR'
                                                        ? "Pilih / ketik nama dari 8 karakter B3 Twinkle Collection..."
                                                        : "Pilih / ketik nama Uma Musume (B1/B2/B3)...")
                                                    : singleForm.banner_type === 'character'
                                                        ? "Type or select Uma Musume (e.g. Epiphaneia, Phalaenopsis, Almond Eye, or manual name)..."
                                                        : "Type or select Support Card (e.g. SSR Kitasan Black, SSR Super Creek, or manual text)..."
                                            }
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                        />

                                        {/* Backdrop for outside click */}
                                        {showSuggestions && (
                                            <div
                                                className="fixed inset-0 z-30"
                                                onClick={() => setShowSuggestions(false)}
                                            />
                                        )}

                                        {/* Floating Suggestions Dropdown */}
                                        {showSuggestions && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 max-h-56 overflow-y-auto py-1">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                                    <span>{isTwinkle ? 'Pool Twinkle Collection (8 B3 + B1 & B2)' : `Database Suggestions (${singleForm.banner_type === 'character' ? 'Characters' : 'Support Cards'})`}</span>
                                                    {isTwinkle ? (
                                                        <span className="text-sky-600 dark:text-sky-400 font-semibold">8 Karakter B3 + Pool B1 & B2</span>
                                                    ) : (
                                                        <span className="text-amber-600 font-medium">Free manual text allowed</span>
                                                    )}
                                                </div>

                                                {currentPool
                                                    .filter(item => !singleForm.item_name || item.toLowerCase().includes(singleForm.item_name.toLowerCase()))
                                                    .slice(0, 15)
                                                    .map((item) => {
                                                        const isTwinkleFeatured = Array.isArray(currentBanner?.featured_items) && currentBanner.featured_items.includes(item);
                                                        const itemRarity = isTwinkleFeatured
                                                            ? 'SSR'
                                                            : ((gachaMeta.character_rarities && gachaMeta.character_rarities[item])
                                                                || (item.startsWith('SSR ') ? 'SSR' : item.startsWith('SR ') ? 'SR' : item.startsWith('R ') ? 'R' : null));
                                                        return (
                                                            <button
                                                                key={item}
                                                                type="button"
                                                                onClick={() => handleSelectItem(item)}
                                                                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700 hover:text-amber-900 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                                            >
                                                                <div className="flex items-center gap-2 truncate pr-2">
                                                                    {itemRarity && (
                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                                                            itemRarity === 'SSR' ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700' :
                                                                            itemRarity === 'SR' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-700' :
                                                                            'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
                                                                        }`}>
                                                                            {itemRarity === 'SSR' && singleForm.banner_type === 'character' ? '3★' :
                                                                             itemRarity === 'SR' && singleForm.banner_type === 'character' ? '2★' :
                                                                             itemRarity === 'R' && singleForm.banner_type === 'character' ? '1★' :
                                                                             itemRarity}
                                                                        </span>
                                                                    )}
                                                                    <span className="truncate">{item}</span>
                                                                </div>
                                                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">Pilih</span>
                                                            </button>
                                                        );
                                                    })}
                                                {currentPool.filter(item => !singleForm.item_name || item.toLowerCase().includes(singleForm.item_name.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-3 text-xs text-slate-500 text-center">
                                                        {isTwinkle
                                                            ? (singleForm.rarity === 'SSR'
                                                                ? 'Tidak ditemukan dalam 8 karakter Twinkle Collection. Harap pilih karakter dari lineup Twinkle.'
                                                                : 'Karakter tidak ditemukan dalam database Uma Musume.')
                                                            : 'No exact match in database — your manual text will be recorded as-is!'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Popular Chips */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                                            {isTwinkle ? 'Lineup 8 Karakter Twinkle:' : 'Quick Picks:'}
                                        </span>
                                        {(isTwinkle && Array.isArray(currentBanner?.featured_items) && currentBanner.featured_items.length > 0
                                            ? currentBanner.featured_items.filter(c => typeof c === 'string' ? c.includes('[') : true)
                                            : (singleForm.banner_type === 'character'
                                                ? ['Epiphaneia [Fate\'s Chosen Star]', 'Phalaenopsis [絶佳の暁闇]', 'Almond Eye [The Changer]', 'Cesario [Twinbell Queen]', 'Duramente [Overclocking Soul]', 'Kitasan Black [Crane\'s Ambition]', 'Special Week [Special Dreamer]', 'Oguri Cap [Starry Nocturne]']
                                                : ['SSR [Fire at My Heels] Kitasan Black (Speed)', 'SSR [Piece of Mind] Super Creek (Stamina)', 'SSR [Tracen Reception] Tazuna Hayakawa (Friend)', 'SSR [Wave of Gratitude] Fine Motion (Intelligence)', 'SR [Tracen Academy] Sweep Tosho (Speed)']
                                            )
                                        ).map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => handleSelectItem(chip)}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer border ${
                                                    isTwinkle
                                                        ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                                }`}
                                            >
                                                {chip.length > 32 ? chip.slice(0, 30) + '...' : chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </form>
                )}
            </div>

            {/* Pulls History Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Filters header */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-slate-500" />
                        <h2 className="text-base font-black text-slate-900">Gacha Pulls History</h2>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-bold">
                            {pagination.total} records
                        </span>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Date From */}
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Dari:</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none font-mono"
                            />
                        </div>

                        {/* Date To */}
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Sampai:</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none font-mono"
                            />
                        </div>

                        {/* 2026 JP Banner Filter */}
                        <select
                            value={gachaBannerFilter}
                            onChange={(e) => { setGachaBannerFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none max-w-[180px] truncate"
                        >
                            <option value="all">Semua Banner 2026</option>
                            {banners.map(b => (
                                <option key={b.id} value={b.id}>
                                    [{getCategoryBadge(b.category).label}] {b.name}
                                </option>
                            ))}
                        </select>

                        {/* Banner Pool Filter */}
                        <select
                            value={bannerFilter}
                            onChange={(e) => { setBannerFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                            <option value="all">Semua Pool</option>
                            <option value="character">Character</option>
                            <option value="support_card">Support Card</option>
                        </select>

                        {/* Rarity Filter */}
                        <select
                            value={rarityFilter}
                            onChange={(e) => { setRarityFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                            <option value="all">Semua Rarity</option>
                            <option value="SSR">SSR Only</option>
                            <option value="SR">SR Only</option>
                            <option value="R">R Only</option>
                        </select>

                        {/* Rate-Up Filter */}
                        <select
                            value={isRateUpFilter}
                            onChange={(e) => { setIsRateUpFilter(e.target.value); setPage(1); }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                            <option value="all">Semua Status</option>
                            <option value="true">Hanya Rate-Up</option>
                            <option value="false">Non Rate-Up</option>
                        </select>

                        {/* Search */}
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari kartu / uma..."
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none w-36 sm:w-40"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </form>

                        {/* Reset Filter Button */}
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Reset seluruh filter ke default"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Alert Bar */}
                {selectedPullIds.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/90 border-b border-amber-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
                        <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                            <span>
                                <strong className="text-amber-700 dark:text-amber-300 font-black">{selectedPullIds.length}</strong> data tarikan dipilih
                            </span>
                        </div>

                        {/* Quick Change Pull Type & Advanced Bulk Edit */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 pl-2.5 rounded-xl border border-amber-300 dark:border-amber-700/80 shadow-2xs">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Ganti Tipe:</span>
                                <select
                                    value={bulkPullType}
                                    onChange={(e) => setBulkPullType(e.target.value)}
                                    className="bg-transparent text-slate-800 dark:text-slate-200 font-extrabold text-xs focus:outline-none cursor-pointer pr-1"
                                >
                                    <option value="custom_ticket">🎟️ Tiket Kustom</option>
                                    <option value="multi_10">⚡ 10x Multi-Pull</option>
                                    <option value="single">🎯 Single Pull (1x)</option>
                                    <option value="ticket">🎫 Ticket Pull</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleQuickBulkUpdatePullType}
                                    disabled={bulkUpdating}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                    title="Terapkan tipe gacha yang dipilih ke semua baris yang dicentang"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{bulkUpdating ? 'Mengubah...' : 'Terapkan'}</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowBulkEditModal(true)}
                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                                title="Buka opsi edit massal lanjutan (tipe gacha, banner, dan tanggal)"
                            >
                                <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                <span>Edit Massal Lanjutan</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => openDeleteModal('bulk')}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus ({selectedPullIds.length})</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedPullIds([])}
                                className="px-2.5 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-3 py-3.5 w-8 text-center">
                                    <input
                                        type="checkbox"
                                        checked={pulls.length > 0 && pulls.every(p => selectedPullIds.includes(p.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const newIds = Array.from(new Set([...selectedPullIds, ...pulls.map(p => p.id)]));
                                                setSelectedPullIds(newIds);
                                            } else {
                                                const pageIds = pulls.map(p => p.id);
                                                setSelectedPullIds(selectedPullIds.filter(id => !pageIds.includes(id)));
                                            }
                                        }}
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        title="Pilih semua data pada halaman ini"
                                    />
                                </th>
                                <th className="px-4 py-3.5">Pulled At</th>
                                <th className="px-4 py-3.5">Banner (2026 JP)</th>
                                <th className="px-4 py-3.5">Pool</th>
                                <th className="px-4 py-3.5">Type</th>
                                <th className="px-4 py-3.5">Item / Character</th>
                                <th className="px-4 py-3.5">Rarity</th>
                                <th className="px-4 py-3.5">Rate-Up</th>
                                <th className="px-4 py-3.5">Pity Count</th>
                                <th className="px-4 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-10 text-slate-400">Loading pulls...</td>
                                </tr>
                            ) : pulls.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-10 text-slate-400">No gacha pull history matching filters.</td>
                                </tr>
                            ) : (
                                pulls.map((p) => {
                                    const isSelected = selectedPullIds.includes(p.id);
                                    return (
                                        <tr key={p.id} className={`transition-colors ${isSelected ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'hover:bg-amber-50/40'}`}>
                                            <td className="px-3 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPullIds(prev => [...prev, p.id]);
                                                        } else {
                                                            setSelectedPullIds(prev => prev.filter(id => id !== p.id));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                                                {p.pulled_at ? String(p.pulled_at).replace('T', ' ').slice(0, 16) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.banner ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(p.banner.category).color}`}>
                                                                {getCategoryBadge(p.banner.category).label}
                                                            </span>
                                                            {p.banner.base_rate > 3.0 ? (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white shadow-2xs shrink-0" title="Banner Rate SSR Boosted 4.5%">
                                                                    4.5% Boost
                                                                </span>
                                                            ) : (
                                                                <span className="px-1 py-0.5 rounded text-[9px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                                                    3.0%
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={p.banner.name}>
                                                                {p.banner.name}
                                                            </span>
                                                        </div>
                                                        {p.banner.start_date && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {p.banner.start_date} ~ {p.banner.end_date || 'Now'}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">General / Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 capitalize font-semibold text-slate-800">
                                                {p.banner_type.replace('_', ' ')}
                                            </td>
                                            <td className="px-4 py-3 capitalize text-slate-600 whitespace-nowrap">
                                                {p.pull_type.replace('_', ' ')}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-900">
                                                {p.item_name}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <RarityBadge rarity={p.rarity} size="sm" />
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.is_rate_up ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                                #{p.pity_count_at_pull}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingPull(p)}
                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit record gacha ini"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal('single', p.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                        title="Hapus record gacha ini"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Dynamic Pagination Footer */}
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Tampilkan</span>
                        <select
                            value={perPage}
                            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none"
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span>entri per halaman &bull; Total <strong>{pagination.total}</strong> entri (Hal {pagination.current_page} dari {pagination.last_page})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={pagination.current_page <= 1}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Prev</span>
                        </button>

                        <span className="px-3 py-1 font-mono font-bold text-slate-800 bg-slate-100 rounded-lg">
                            {pagination.current_page} / {pagination.last_page}
                        </span>

                        <button
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => setPage(prev => Math.min(pagination.last_page, prev + 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
            </>
            )}

            {/* Game Database Directory Modal (Gametora / Kamigame / Gamewith) */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                                        Database Game Uma Musume (GameTora / Kamigame)
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Pilih karakter atau kartu bantuan resmi untuk pengisian otomatis, atau ketik teks kustom Anda secara manual
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* GameTora Sync Status & Action Bar */}
                        <div className="mt-3 p-3 bg-amber-50/70 dark:bg-slate-800/90 border border-amber-200/80 dark:border-slate-700/90 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                                    <span className="font-bold text-slate-800 dark:text-white">Database GameTora JP</span>
                                </div>
                                <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                    {syncStatus?.last_synced_at
                                        ? `Disinkronkan: ${new Date(syncStatus.last_synced_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
                                        : 'Status: Katalog Standar'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={syncing}
                                    onClick={() => handleSyncCatalog(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                                    title="Perbarui daftar karakter baru dan support card dari GameTora server Jepang"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                                    <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan GameTora'}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={syncing}
                                    onClick={() => handleSyncCatalog(true)}
                                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white active:scale-95 disabled:opacity-50 text-xs transition cursor-pointer"
                                    title="Paksa unduh ulang dari awal (Force Refresh)"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Banner Type Tabs inside Modal */}
                        <div className="flex items-center gap-2 pt-3">
                            <button
                                type="button"
                                onClick={() => setSingleForm(prev => ({ ...prev, banner_type: 'character' }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    singleForm.banner_type === 'character'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Karakter / Uma ({gachaMeta.characters?.length || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSingleForm(prev => ({ ...prev, banner_type: 'support_card' }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    singleForm.banner_type === 'support_card'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Kartu Bantuan ({gachaMeta.support_cards?.length || 0})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="py-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    placeholder={
                                        singleForm.banner_type === 'character'
                                            ? "Cari karakter (misal: Epiphaneia, Phalaenopsis, Almond Eye, Oguri Cap)..."
                                            : "Cari kartu bantuan (misal: Kitasan Black, Super Creek, Tazuna, Sweep Tosho)..."
                                    }
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Item Grid */}
                        <div className="flex-1 overflow-y-auto py-2 pr-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {currentPool
                                    .filter(item => !modalSearch || item.toLowerCase().includes(modalSearch.toLowerCase()))
                                    .map((item) => {
                                        const itemRarity = (gachaMeta.character_rarities && gachaMeta.character_rarities[item])
                                            || (item.startsWith('SSR ') ? 'SSR' : item.startsWith('SR ') ? 'SR' : item.startsWith('R ') ? 'R' : null);
                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => {
                                                    handleSelectItem(item);
                                                    setShowModal(false);
                                                }}
                                                className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                                    singleForm.item_name === item
                                                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                    {itemRarity && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                                            singleForm.item_name === item
                                                                ? 'bg-white/25 text-white'
                                                                : itemRarity === 'SSR' ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
                                                                : itemRarity === 'SR' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-300 dark:border-yellow-700'
                                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                            {itemRarity === 'SSR' && singleForm.banner_type === 'character' ? '3★' :
                                                             itemRarity === 'SR' && singleForm.banner_type === 'character' ? '2★' :
                                                             itemRarity === 'R' && singleForm.banner_type === 'character' ? '1★' :
                                                             itemRarity}
                                                        </span>
                                                    )}
                                                    <span className="truncate">{item}</span>
                                                </div>
                                                {singleForm.item_name === item ? (
                                                    <span className="text-white font-black shrink-0">✓</span>
                                                ) : (
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0">Pilih</span>
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>
                                Menampilkan {
                                    currentPool.filter(item => !modalSearch || item.toLowerCase().includes(modalSearch.toLowerCase())).length
                                } item (Teks bebas manual juga diizinkan)
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick 10-Pull Input Modal */}
            <Quick10PullModal
                isOpen={showQuick10Modal}
                onClose={() => setShowQuick10Modal(false)}
                onSuccess={() => {
                    fetchStats();
                    fetchPulls();
                }}
                banners={banners}
                gachaMeta={gachaMeta}
                onNotify={onNotify}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, mode: 'single', id: null, count: 1, loading: false })}
                onConfirm={handleConfirmDelete}
                title={deleteModal.mode === 'bulk' ? 'Hapus Data Tarikan Terpilih?' : 'Hapus Record Gacha?'}
                message={
                    deleteModal.mode === 'bulk'
                        ? `Apakah Anda yakin ingin menghapus ${deleteModal.count} data tarikan gacha yang dipilih? Pity counter banner terkait akan dihitung ulang secara otomatis.`
                        : 'Apakah Anda yakin ingin menghapus catatan gacha ini? Pity counter banner terkait akan diperbarui secara otomatis.'
                }
                itemCount={deleteModal.count}
                confirmText={deleteModal.mode === 'bulk' ? `Ya, Hapus ${deleteModal.count} Data` : 'Ya, Hapus Data'}
                loading={deleteModal.loading}
            />

            {/* Edit Gacha Pull Modal */}
            <EditGachaPullModal
                pull={editingPull}
                isOpen={!!editingPull}
                onClose={() => setEditingPull(null)}
                onSuccess={(updatedPull, msg) => {
                    onNotify?.(msg || 'Data pull berhasil diperbarui.', 'success');
                    fetchStats();
                    fetchPulls();
                }}
                banners={banners}
                gachaMeta={gachaMeta}
            />

            {/* Bulk Edit Gacha Pull Modal */}
            <BulkEditGachaPullModal
                isOpen={showBulkEditModal}
                onClose={() => setShowBulkEditModal(false)}
                selectedIds={selectedPullIds}
                banners={banners}
                onSuccess={(count, msg) => {
                    onNotify?.(msg || `${count} data pull gacha berhasil diperbarui.`, 'success');
                    setSelectedPullIds([]);
                    fetchStats();
                    fetchPulls();
                }}
                onNotify={onNotify}
            />
        </div>
    );
}
