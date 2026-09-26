import React, { useState, useEffect, useMemo } from 'react';
import { 
    ScrollText, 
    X, 
    Search, 
    Calendar, 
    Sparkles, 
    Tag, 
    ChevronDown, 
    ChevronUp, 
    RefreshCw, 
    Layers, 
    CheckCircle2,
    SlidersHorizontal,
    ExternalLink
} from 'lucide-react';

export default function ChangelogModal({ isOpen, onClose }) {
    const [changelogData, setChangelogData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVersion, setSelectedVersion] = useState('all');
    const [expandedVersions, setExpandedVersions] = useState({});

    // Fetch changelog from backend
    const fetchChangelog = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/changelog');
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal memuat catatan pembaruan.');
            }
            setChangelogData(data);
            
            // Expand latest 3 versions by default
            const initialExpanded = {};
            (data.versions || []).forEach((ver, index) => {
                if (index < 3) {
                    initialExpanded[ver.version] = true;
                }
            });
            setExpandedVersions(initialExpanded);
        } catch (err) {
            console.error('Error fetching changelog:', err);
            setError(err.message || 'Terjadi kesalahan saat memuat changelog.');
        } finally {
            setLoading(false);
        }
    };

    // Load on open
    useEffect(() => {
        if (isOpen) {
            if (!changelogData) {
                fetchChangelog();
            }
            setSearchQuery('');
            setSelectedVersion('all');
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Toggle single version expansion
    const toggleVersion = (version) => {
        setExpandedVersions((prev) => ({
            ...prev,
            [version]: !prev[version],
        }));
    };

    // Expand all or Collapse all
    const expandAll = () => {
        const next = {};
        (changelogData?.versions || []).forEach((v) => {
            next[v.version] = true;
        });
        setExpandedVersions(next);
    };

    const collapseAll = () => {
        setExpandedVersions({});
    };

    // Filter versions by search and selected version
    const filteredVersions = useMemo(() => {
        if (!changelogData?.versions) return [];
        let list = changelogData.versions;

        if (selectedVersion !== 'all') {
            list = list.filter((v) => v.version === selectedVersion);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter((v) => {
                return (
                    v.version.toLowerCase().includes(query) ||
                    v.title.toLowerCase().includes(query) ||
                    v.date.toLowerCase().includes(query) ||
                    v.raw_markdown.toLowerCase().includes(query) ||
                    (v.highlights && v.highlights.some((h) => h.toLowerCase().includes(query)))
                );
            });
        }

        return list;
    }, [changelogData, selectedVersion, searchQuery]);

    if (!isOpen) return null;

    const latestVersion = changelogData?.latest_version;
    const totalVersions = changelogData?.total_versions || 0;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 text-white p-5 flex items-center justify-between border-b border-emerald-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-950/70 text-amber-300 border border-emerald-600/60 shadow-xs shrink-0">
                            <ScrollText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-lg text-white tracking-tight">
                                    Riwayat Pembaruan
                                </h3>
                                {latestVersion && (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900 shadow-xs">
                                        v{latestVersion}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-emerald-200 line-clamp-1">
                                Catatan rilis lengkap fitur, pembaruan data, dan peningkatan performa sistem
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Tutup (Esc)"
                        aria-label="Tutup Riwayat Pembaruan"
                        className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari versi, fitur, perbaikan, atau kata kunci..."
                                className="w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-slate-100 placeholder:text-slate-400 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Expand/Collapse Controls & Reload */}
                        <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                            <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                <button
                                    type="button"
                                    onClick={expandAll}
                                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    Buka Semua
                                </button>
                                <span className="text-slate-400">|</span>
                                <button
                                    type="button"
                                    onClick={collapseAll}
                                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    Tutup Semua
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={fetchChangelog}
                                disabled={loading}
                                title="Muat ulang changelog"
                                className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Version Quick Jump Pills */}
                    {changelogData?.versions && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
                            <button
                                type="button"
                                onClick={() => setSelectedVersion('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer text-[11px] ${
                                    selectedVersion === 'all'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Semua Versi ({totalVersions})
                            </button>
                            {changelogData.versions.map((ver, idx) => {
                                const isLatest = ver.version === latestVersion;
                                const isSelected = selectedVersion === ver.version;
                                return (
                                    <button
                                        key={ver.version}
                                        type="button"
                                        onClick={() => setSelectedVersion(ver.version)}
                                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                                            isSelected
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : isLatest
                                                ? 'bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300'
                                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>v{ver.version}</span>
                                        {isLatest && !isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-100">
                    {/* Loading State */}
                    {loading && (
                        <div className="py-16 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                Memuat catatan riwayat pembaruan...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-center space-y-2">
                            <p className="text-sm font-bold">{error}</p>
                            <button
                                type="button"
                                onClick={fetchChangelog}
                                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* Intro Callout (Only shown when not filtering by specific version or search) */}
                    {!loading && !error && selectedVersion === 'all' && !searchQuery && changelogData?.header_intro_html && (
                        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 p-4 rounded-2xl flex items-start gap-3.5">
                            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div 
                                className="text-xs space-y-1 text-emerald-900 dark:text-emerald-200 changelog-html leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: changelogData.header_intro_html }}
                            />
                        </div>
                    )}

                    {/* Empty Search Results */}
                    {!loading && !error && filteredVersions.length === 0 && (
                        <div className="py-12 text-center space-y-2">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Tidak ada versi yang cocok
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Coba gunakan kata kunci pencarian lain atau pilih opsi &quot;Semua Versi&quot;.
                            </p>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                >
                                    Bersihkan pencarian
                                </button>
                            )}
                        </div>
                    )}

                    {/* Version Cards List */}
                    {!loading && !error && filteredVersions.length > 0 && (
                        <div className="space-y-3.5">
                            {filteredVersions.map((item) => {
                                const isLatest = item.version === latestVersion;
                                const isExpanded = !!expandedVersions[item.version];

                                return (
                                    <div 
                                        key={item.version}
                                        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                            isLatest
                                                ? 'bg-gradient-to-b from-white to-amber-50/30 dark:from-slate-900 dark:to-slate-900/90 border-amber-300 dark:border-amber-700/60 shadow-sm ring-1 ring-amber-400/20'
                                                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xs'
                                        }`}
                                    >
                                        {/* Card Header (Clickable to toggle accordion) */}
                                        <div 
                                            onClick={() => toggleVersion(item.version)}
                                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none transition-colors"
                                        >
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                                                {/* Version Badge */}
                                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-xs ${
                                                    isLatest
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-slate-800 dark:bg-slate-700 text-white'
                                                }`}>
                                                    v{item.version}
                                                </span>

                                                {/* Latest Tag */}
                                                {isLatest && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
                                                        Terbaru
                                                    </span>
                                                )}

                                                {/* Release Date */}
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{item.date}</span>
                                                </div>

                                                {/* Highlights Tags (desktop preview) */}
                                                {item.highlights && item.highlights.length > 0 && !isExpanded && (
                                                    <div className="hidden md:flex items-center gap-1 ml-1">
                                                        {item.highlights.slice(0, 3).map((h, i) => (
                                                            <span 
                                                                key={i}
                                                                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                                            >
                                                                {h}
                                                            </span>
                                                        ))}
                                                        {item.highlights.length > 3 && (
                                                            <span className="text-[10px] text-slate-400">
                                                                +{item.highlights.length - 3} lainnya
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expand/Collapse Chevron */}
                                            <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Expanded Content */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 dark:border-slate-800/80">
                                                <div 
                                                    className="changelog-html text-slate-700 dark:text-slate-300"
                                                    dangerouslySetInnerHTML={{ __html: item.html }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Semantic Versioning (SemVer) • Total {totalVersions} Catatan Rilis</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer text-xs"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
