import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    Target, 
    Clock, 
    Zap, 
    CheckCircle2, 
    AlertTriangle, 
    Flame, 
    ChevronRight,
    Edit2,
    Check,
    X,
    Calendar,
    Award
} from 'lucide-react';

export default function CirclePaceWidget({ 
    initialPaceData = null, 
    circleGoal = 30000000, 
    onUpdateGoal,
    compact = false 
}) {
    const [pace, setPace] = useState(initialPaceData);
    const [loading, setLoading] = useState(!initialPaceData);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(circleGoal);
    const [savingGoal, setSavingGoal] = useState(false);

    const fetchPace = async (targetVal = null) => {
        try {
            setLoading(true);
            const url = targetVal 
                ? `/api/circle-tracker/pace?target=${targetVal}`
                : '/api/circle-tracker/pace';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setPace(data);
            }
        } catch (err) {
            console.error('Failed to load circle pace:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialPaceData) {
            setPace(initialPaceData);
        } else {
            fetchPace(circleGoal);
        }
    }, [initialPaceData, circleGoal]);

    const handleSaveGoal = async () => {
        const val = parseInt(tempGoal, 10);
        if (isNaN(val) || val < 10000) return;

        setSavingGoal(true);
        try {
            await onUpdateGoal?.(val);
            await fetchPace(val);
            setIsEditingGoal(false);
        } catch (err) {
            console.error('Failed to save circle goal:', err);
        } finally {
            setSavingGoal(false);
        }
    };

    if (loading && !pace) {
        return (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse flex items-center justify-center min-h-[140px]">
                <div className="flex items-center gap-2.5 text-xs text-slate-400 font-bold">
                    <Clock className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Mengkalkulasi Ritme & Estimasi Run Circle...</span>
                </div>
            </div>
        );
    }

    if (!pace) return null;

    const {
        monthly_circle_target = 30000000,
        current_fans = 0,
        remaining_fans = 0,
        days_remaining = 1,
        days_in_month = 30,
        current_day = 1,
        required_daily_pace = 0,
        current_daily_pace = 0,
        avg_fans_per_run = 450000,
        estimated_runs_per_day = 0,
        status = 'On Track',
        progress_percentage = 0,
        is_target_reached = false,
    } = pace;

    // Status Badge Configuration
    const statusConfig = {
        'Ahead of Pace': {
            label: 'Ahead of Pace (Unggul)',
            color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
            icon: CheckCircle2,
            accent: 'text-emerald-500',
            bgGlow: 'from-emerald-500/10 via-teal-500/5 to-transparent',
            badgeBg: 'bg-emerald-600 text-white',
        },
        'On Track': {
            label: 'On Track (Stabil)',
            color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
            icon: TrendingUp,
            accent: 'text-amber-500',
            bgGlow: 'from-amber-500/10 via-orange-500/5 to-transparent',
            badgeBg: 'bg-amber-600 text-white',
        },
        'Behind Schedule': {
            label: 'Behind Schedule (Perlu Kejar)',
            color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
            icon: AlertTriangle,
            accent: 'text-rose-500',
            bgGlow: 'from-rose-500/10 via-red-500/5 to-transparent',
            badgeBg: 'bg-rose-600 text-white',
        },
    };

    const currentStatus = statusConfig[status] || statusConfig['On Track'];
    const StatusIcon = currentStatus.icon;

    return (
        <div className={`rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden relative ${compact ? 'p-5' : 'p-6 sm:p-7'}`}>
            {/* Ambient Background Gradient Accent */}
            <div className={`absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gradient-to-br ${currentStatus.bgGlow} blur-3xl pointer-events-none`}></div>

            <div className="relative z-10 space-y-5">
                {/* Header: Title, Status Badge, Edit Goal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Ritme Harian & Estimasi Run Circle
                                </h3>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Bulan Ini
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Pantau ritme grinding fans harian agar target kuota bulanan tercapai tepat waktu
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className={`px-3 py-1.5 rounded-full border text-xs font-black flex items-center gap-1.5 shadow-sm ${currentStatus.color}`}>
                            <StatusIcon className="w-4 h-4 shrink-0" />
                            <span>{currentStatus.label}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar Bulanan */}
                <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                Total Fans Terkumpul:
                            </span>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                {current_fans.toLocaleString()}
                            </span>
                            <span className="text-slate-400">/</span>
                            {isEditingGoal ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={tempGoal}
                                        onChange={(e) => setTempGoal(e.target.value)}
                                        step="1000000"
                                        min="100000"
                                        className="w-28 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-500 text-xs font-mono font-bold text-slate-800 dark:text-white"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        disabled={savingGoal}
                                        onClick={handleSaveGoal}
                                        className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                        title="Simpan Target"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingGoal(false)}
                                        className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                                        title="Batal"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                    <span>Target: {monthly_circle_target.toLocaleString()}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTempGoal(monthly_circle_target);
                                            setIsEditingGoal(true);
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                        title="Ubah Target Kuota Bulanan"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                        <div className="font-mono font-black text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <span>{progress_percentage}% Tercapai</span>
                            {is_target_reached && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                                    Target Terpenuhi! 🎉
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Bar Track */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-700 rounded-full bg-gradient-to-r ${
                                is_target_reached 
                                    ? 'from-emerald-500 to-teal-400' 
                                    : status === 'Behind Schedule'
                                        ? 'from-amber-500 to-rose-500'
                                        : 'from-emerald-600 via-teal-500 to-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, progress_percentage))}%` }}
                        ></div>
                    </div>
                </div>

                {/* Main Hero Card: Target Run / Hari */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Big Daily Target Box */}
                    <div className="md:col-span-1 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg shadow-emerald-600/15 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10 pointer-events-none">
                            <Flame className="w-32 h-32 text-white" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-amber-300" />
                                <span>Beban Grinding Harian</span>
                            </span>
                            <div className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight flex items-baseline gap-1.5">
                                <span>Target:</span>
                                <span className="text-amber-300 text-4xl sm:text-5xl font-black">
                                    {is_target_reached ? '0' : estimated_runs_per_day}
                                </span>
                                <span className="text-lg font-bold text-emerald-100">Run / Hari</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-emerald-500/40 text-[11px] text-emerald-100/90 space-y-1">
                            <div className="flex justify-between">
                                <span>Rata-rata Fans / Run:</span>
                                <span className="font-mono font-bold text-amber-200">
                                    ~{avg_fans_per_run.toLocaleString()}
                                </span>
                            </div>
                            <div className="text-[10px] text-emerald-200/80">
                                *Dihitung dari riwayat 30 hari terakhir Career Run Anda
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics 2x2 Grid */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-3">
                        {/* Required Daily Pace */}
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Kebutuhan Ritme (Req. Pace)</span>
                            </span>
                            <div className="my-2">
                                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                                    {required_daily_pace.toLocaleString()}
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Fans harus diraih per hari
                                </span>
                            </div>
                            <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5 flex justify-between">
                                <span>Sisa Fans:</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {remaining_fans.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Current Daily Pace */}
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>Ritme Riil Saat Ini (Current Pace)</span>
                            </span>
                            <div className="my-2">
                                <div className={`text-xl sm:text-2xl font-black font-mono ${
                                    current_daily_pace >= required_daily_pace
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                    {current_daily_pace.toLocaleString()}
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Rata-rata fans riil / hari bulan ini
                                </span>
                            </div>
                            <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5 flex justify-between">
                                <span>Performa:</span>
                                <span className={`font-bold ${
                                    current_daily_pace >= required_daily_pace ? 'text-emerald-600' : 'text-amber-600'
                                }`}>
                                    {required_daily_pace > 0 
                                        ? `${Math.round((current_daily_pace / required_daily_pace) * 100)}% dari target harian`
                                        : '100%'}
                                </span>
                            </div>
                        </div>

                        {/* Days Remaining */}
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                <span>Sisa Waktu Kalender</span>
                            </span>
                            <div className="my-2">
                                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                                    {days_remaining} <span className="text-sm font-bold text-slate-500">Hari Lagi</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Hari ke-{current_day} dari {days_in_month} hari
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                                Akhir periode bulan berjalan
                            </div>
                        </div>

                        {/* Average Run Metric Box */}
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-purple-500" />
                                <span>Efisiensi Career Training</span>
                            </span>
                            <div className="my-2">
                                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                                    ~{(avg_fans_per_run / 1000).toFixed(0)}k <span className="text-sm font-bold text-slate-500">Fans/Run</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    Rata-rata perolehan tiap karier
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                                {is_target_reached 
                                    ? 'Target bulan ini selesai! 🎉' 
                                    : `Butuh ±${Math.ceil(remaining_fans / Math.max(1, avg_fans_per_run))} run total s/d akhir bulan`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
