import React, { useState, useEffect, useRef } from 'react';
import { 
    Database, 
    Download, 
    Upload, 
    X, 
    AlertTriangle, 
    CheckCircle2, 
    RefreshCw, 
    FileText, 
    Sparkles, 
    Trophy, 
    Layers, 
    BookOpen, 
    Settings, 
    Users,
    HardDrive
} from 'lucide-react';

export default function BackupRestoreModal({ isOpen, onClose, onRestoreSuccess, notify }) {
    const [activeTab, setActiveTab] = useState('backup'); // 'backup' or 'restore'
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    
    // Restore states
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [restoreMode, setRestoreMode] = useState('merge'); // 'merge' or 'overwrite'
    const [restoring, setRestoring] = useState(false);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);

    const fileInputRef = useRef(null);

    // Fetch live statistics
    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const res = await fetch('/api/backup/stats');
            const json = await res.json();
            if (json.success) {
                setStats(json.stats);
            }
        } catch (err) {
            console.error('Failed to fetch backup stats:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchStats();
            setSelectedFile(null);
            setFilePreview(null);
            setFileError(null);
            setConfirmOverwrite(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Handle File Selection
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setFileError(null);
        setFilePreview(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (!parsed || !parsed.data || typeof parsed.data !== 'object') {
                    throw new Error('File JSON ini bukan cadangan data Uma Musume Companion yang valid (elemen "data" tidak ditemukan).');
                }
                setFilePreview(parsed);
            } catch (err) {
                setFileError(err.message || 'File bukan file JSON yang valid.');
                setSelectedFile(null);
            }
        };
        reader.onerror = () => {
            setFileError('Gagal membaca file.');
            setSelectedFile(null);
        };
        reader.readAsText(file);
    };

    // Trigger JSON Export Download
    const handleDownloadBackup = () => {
        window.location.href = '/api/backup/export?download=1';
        notify?.('Memulai pengunduhan file cadangan (.json)...', 'info');
    };

    // Execute Restore
    const handleExecuteRestore = async () => {
        if (!selectedFile) {
            notify?.('Silakan pilih file backup terlebih dahulu.', 'error');
            return;
        }

        if (restoreMode === 'overwrite' && !confirmOverwrite) {
            setConfirmOverwrite(true);
            return;
        }

        setRestoring(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('mode', restoreMode);

            const res = await fetch('/api/backup/import', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Gagal memulihkan data');
            }

            notify?.(result.message || 'Pemulihan data berhasil!', 'success');
            onRestoreSuccess?.();
            fetchStats();
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err) {
            notify?.(err.message, 'error');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-950/60 text-amber-300 border border-emerald-700/60 shadow-xs">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-white tracking-tight">
                                Cadangkan & Pulihkan Data
                            </h3>
                            <p className="text-xs text-emerald-200">
                                Backup & Restore data gacha, fans gain, katalog GameTora, dan banner 2026
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/80 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('backup')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeTab === 'backup'
                                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <Download className="w-4 h-4" />
                        <span>1. Cadangkan Data (Backup / Ekspor)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('restore')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeTab === 'restore'
                                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <Upload className="w-4 h-4" />
                        <span>2. Pulihkan Data (Restore / Impor)</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
                    {/* Active Tab: Backup */}
                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            {/* Information Box */}
                            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl flex items-start gap-3.5">
                                <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1">
                                    <h4 className="font-black text-emerald-900 dark:text-emerald-300">
                                        Pencadangan Lengkap Satu File (.JSON)
                                    </h4>
                                    <p className="text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
                                        Seluruh data riwayat pull gacha, pity count, catatan karir fans gain, katalog karakter & support card GameTora (termasuk Terjemahan Kondisi Skill Otentik, Metadata Efek & Target Karir), serta daftar gacha banner 2026 akan dikemas ke dalam satu file JSON terenkapsulasi yang aman disimpan di penyimpanan lokal Anda.
                                    </p>
                                </div>
                            </div>

                            {/* Database Stats Cards */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Data Siap Dicadangkan:
                                    </span>
                                    {loadingStats && (
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <RefreshCw className="w-3 h-3 animate-spin" /> Memuat...
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.gacha_pulls?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Gacha Pulls
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                            <Trophy className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.career_runs?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Career Runs
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.gacha_banners?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Banner 2026 JP
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.uma_catalog_items?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Katalog GameTora
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.circle_snapshots?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Snapshots Club
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.user_characters?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Koleksi Karakter
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.user_support_cards?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Koleksi Support
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black font-mono">
                                                {stats?.app_settings?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                Pengaturan App
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Download Action */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadBackup}
                                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>Unduh Cadangan Lengkap (.JSON)</span>
                                </button>
                                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2">
                                    File akan langsung diunduh ke folder Downloads browser Anda dengan timestamp saat ini.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Active Tab: Restore */}
                    {activeTab === 'restore' && (
                        <div className="space-y-6">
                            {/* File Upload Dropzone */}
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                                        selectedFile 
                                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-3">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    {selectedFile ? (
                                        <div>
                                            <p className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                                Pilih atau Seret File Backup JSON ke Sini
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                Hanya file .json hasil ekspor Uma Musume Companion
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {fileError && (
                                    <div className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>{fileError}</span>
                                    </div>
                                )}
                            </div>

                            {/* File Preview if valid */}
                            {filePreview && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            Pratinjau Isi File Backup
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">
                                            Dicadangkan: {filePreview.exported_at ? filePreview.exported_at.slice(0, 16).replace('T', ' ') : '-'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                            <div className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                                {filePreview.summary?.gacha_pulls ?? filePreview.data?.gacha_pulls?.length ?? 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Pulls</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                {filePreview.summary?.career_runs ?? filePreview.data?.career_runs?.length ?? 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Career Runs</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                            <div className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                                                {filePreview.summary?.gacha_banners ?? filePreview.data?.gacha_banners?.length ?? 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Banner 2026</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                            <div className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                                                {filePreview.summary?.uma_catalog_items ?? filePreview.data?.uma_catalog_items?.length ?? 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Katalog GameTora</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                            <div className="font-bold text-pink-600 dark:text-pink-400 font-mono">
                                                {filePreview.summary?.user_characters ?? filePreview.data?.user_characters?.length ?? 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Koleksi Uma</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                            <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                                {filePreview.summary?.user_support_cards ?? filePreview.data?.user_support_cards?.length ?? 0}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Koleksi Support</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Restore Mode Selector */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Pilih Metode Pemulihan:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                                        restoreMode === 'merge'
                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="radio"
                                                name="restore_mode"
                                                value="merge"
                                                checked={restoreMode === 'merge'}
                                                onChange={() => { setRestoreMode('merge'); setConfirmOverwrite(false); }}
                                                className="text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                                Gabungkan Data (Merge)
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold ml-auto">
                                                Aman
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                                            Menambahkan data baru dari file backup tanpa menghapus pull atau run yang sudah tercatat.
                                        </p>
                                    </label>

                                    <label className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                                        restoreMode === 'overwrite'
                                            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-500 ring-1 ring-rose-500'
                                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="radio"
                                                name="restore_mode"
                                                value="overwrite"
                                                checked={restoreMode === 'overwrite'}
                                                onChange={() => setRestoreMode('overwrite')}
                                                className="text-rose-600 focus:ring-rose-500"
                                            />
                                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                                Ganti Semua (Overwrite)
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold ml-auto">
                                                Hati-hati
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                                            Mengosongkan database saat ini dan menggantikannya secara menyeluruh dengan isi backup.
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Overwrite Confirmation Alert */}
                            {restoreMode === 'overwrite' && confirmOverwrite && (
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 space-y-2 animate-fadeIn">
                                    <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                        <span>Konfirmasi Penggantian Data Menyeluruh (Overwrite)</span>
                                    </div>
                                    <p className="leading-relaxed">
                                        Tindakan ini akan <strong>menghapus permanen</strong> riwayat gacha pulls, career runs, dan data lokal saat ini sebelum mengimpor file backup. Pastikan Anda yakin!
                                    </p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleExecuteRestore}
                                    disabled={!selectedFile || restoring}
                                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                        restoreMode === 'overwrite'
                                            ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30'
                                            : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-600/30'
                                    }`}
                                >
                                    {restoring ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            <span>Memulihkan Data Database...</span>
                                        </>
                                    ) : restoreMode === 'overwrite' && !confirmOverwrite ? (
                                        <>
                                            <AlertTriangle className="w-5 h-5" />
                                            <span>Lanjutkan dengan Overwrite...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            <span>
                                                {restoreMode === 'overwrite' 
                                                    ? 'Ya, Ganti Semua Data Sekarang' 
                                                    : 'Mulai Pemulihan Data (Merge)'}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                        Uma Musume Companion • Backup Tool v1.0
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
