import React, { useState } from 'react';
import { Layers, X, Check, AlertCircle, Sparkles, Calendar, Ticket } from 'lucide-react';

export default function BulkEditGachaPullModal({
    isOpen,
    onClose,
    selectedIds = [],
    banners = [],
    onSuccess,
    onNotify,
}) {
    if (!isOpen || selectedIds.length === 0) return null;

    const [pullType, setPullType] = useState('custom_ticket');
    const [bannerId, setBannerId] = useState('keep');
    const [updateDate, setUpdateDate] = useState(false);
    const [pulledAt, setPulledAt] = useState(new Date().toISOString().slice(0, 10));
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);

        const payload = {
            ids: selectedIds,
        };

        if (pullType !== 'keep') {
            payload.pull_type = pullType;
        }

        if (bannerId !== 'keep' && bannerId !== '') {
            payload.gacha_banner_id = parseInt(bannerId, 10);
        }

        if (updateDate && pulledAt) {
            payload.pulled_at = pulledAt;
        }

        if (Object.keys(payload).length <= 1) {
            setErrorMsg('Silakan pilih minimal satu atribut untuk diubah.');
            setSubmitting(false);
            return;
        }

        try {
            const res = await fetch('/api/gacha/pulls/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal memperbarui data secara massal.');
            }

            onSuccess?.(data.updated_count, data.message);
            onClose();
        } catch (err) {
            console.error('Error during bulk update:', err);
            setErrorMsg(err.message || 'Terjadi kesalahan saat memperbarui data.');
            onNotify?.(err.message || 'Gagal memperbarui data gacha.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Edit Massal Riwayat Gacha</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                                    {selectedIds.length} Baris
                                </span>
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Terapkan perubahan serentak untuk semua baris yang Anda pilih
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {errorMsg && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Pull Type Option */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5 text-amber-500" />
                            <span>Tipe Gacha (Pull Type):</span>
                        </label>
                        <select
                            value={pullType}
                            onChange={(e) => setPullType(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                            <option value="custom_ticket">🎟️ Tiket Kustom (Custom Ticket)</option>
                            <option value="multi_10">⚡ 10x Multi-Pull</option>
                            <option value="single">🎯 Single Pull (1x)</option>
                            <option value="ticket">🎫 Ticket Pull</option>
                            <option value="keep">— Jangan Ubah Tipe Pull —</option>
                        </select>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Misal mengubah 15 baris sekaligus menjadi Tiket Kustom atau 10x Multi-Pull.
                        </p>
                    </div>

                    {/* Banner JP 2026 Option (Optional) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Banner JP 2026 (Opsional):</span>
                        </label>
                        <select
                            value={bannerId}
                            onChange={(e) => setBannerId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                            <option value="keep">— Jangan Ubah Banner (Pertahankan Banner Asal) —</option>
                            {banners.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name} ({b.banner_type === 'character' ? 'Uma' : 'Support'})
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Jika dipilih, banner dan penghitungan pity kartu yang dipilih akan disinkronkan ke banner baru.
                        </p>
                    </div>

                    {/* Pull Date Option (Optional) */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={updateDate}
                                onChange={(e) => setUpdateDate(e.target.checked)}
                                className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                            />
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <span>Samakan Tanggal Pull (Opsional)</span>
                        </label>
                        {updateDate && (
                            <input
                                type="date"
                                value={pulledAt}
                                onChange={(e) => setPulledAt(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none animate-fadeIn"
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-md shadow-amber-400/20 cursor-pointer disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            <span>
                                {submitting ? 'Memperbarui...' : `Terapkan ke ${selectedIds.length} Data`}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
