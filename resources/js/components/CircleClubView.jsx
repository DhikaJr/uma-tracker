import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Users, 
    RefreshCw, 
    Trophy, 
    Award, 
    Clock, 
    Flame, 
    TrendingUp, 
    Search, 
    UserCheck, 
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Settings,
    FileText,
    Mail,
    ShieldAlert,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid 
} from 'recharts';
import CirclePaceWidget from './CirclePaceWidget';

// Period Formatting Helpers (Gambar 1)
const formatPeriodJp = (periodStr) => {
    if (!periodStr) return '2026年10月';
    const match = String(periodStr).match(/^(\d{4})-(\d{2})/);
    return match ? `${match[1]}年${parseInt(match[2], 10)}月` : String(periodStr);
};

const formatPeriodId = (periodStr) => {
    if (!periodStr) return 'Oktober 2026';
    const match = String(periodStr).match(/^(\d{4})-(\d{2})/);
    if (match) {
        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const monthIdx = parseInt(match[2], 10) - 1;
        return `${monthNames[monthIdx] || ''} ${match[1]}`;
    }
    return String(periodStr);
};

export default function CircleClubView({ onNotify, circleGoal = 20000000 }) {
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('rank'); // rank, contribution, todayDelta, weekDelta, totalFans
    const [sortAsc, setSortAsc] = useState(true);
    const [countdownSecs, setCountdownSecs] = useState(0);

    // Period Selection State (Gambar 1)
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
    const periodDropdownRef = useRef(null);

    // Active Period and Grouped Periods Memo (Declared BEFORE any early return)
    const currentPeriod = statusData?.period || '2026-10-01';
    const activePeriodKey = (() => {
        const match = String(currentPeriod).match(/^(\d{4})-(\d{2})/);
        return match ? `${match[1]}-${match[2]}` : '2026-10';
    })();

    const groupedPeriods = useMemo(() => {
        const rawList = (statusData?.available_periods && statusData.available_periods.length > 0)
            ? statusData.available_periods
            : [statusData?.period || '2026-10-01'];

        const map = {};
        rawList.forEach((p) => {
            const str = String(p).trim();
            const m = str.match(/^(\d{4})-(\d{2})/);
            if (m) {
                const yr = m[1];
                const mo = parseInt(m[2], 10);
                const key = `${yr}-${String(mo).padStart(2, '0')}`;
                if (!map[yr]) map[yr] = [];
                if (!map[yr].some(item => item.key === key)) {
                    map[yr].push({ year: yr, month: mo, key, raw: p });
                }
            }
        });

        // Ensure current month and previous month exist
        const now = new Date();
        const currYr = String(now.getFullYear());
        const currMo = now.getMonth() + 1;
        const prevMoDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYr = String(prevMoDate.getFullYear());
        const prevMo = prevMoDate.getMonth() + 1;

        const currKey = `${currYr}-${String(currMo).padStart(2, '0')}`;
        if (!map[currYr]) map[currYr] = [];
        if (!map[currYr].some(item => item.key === currKey)) {
            map[currYr].push({ year: currYr, month: currMo, key: currKey, raw: `${currKey}-01` });
        }

        const prevKey = `${prevYr}-${String(prevMo).padStart(2, '0')}`;
        if (!map[prevYr]) map[prevYr] = [];
        if (!map[prevYr].some(item => item.key === prevKey)) {
            map[prevYr].push({ year: prevYr, month: prevMo, key: prevKey, raw: `${prevKey}-01` });
        }

        const sortedYears = Object.keys(map).sort((a, b) => b.localeCompare(a));
        sortedYears.forEach(yr => {
            map[yr].sort((a, b) => b.month - a.month);
        });

        return { sortedYears, map };
    }, [statusData?.available_periods, statusData?.period]);

    // Pre-scraping & Circle Switching State
    const [inputCircleId, setInputCircleId] = useState('');
    const [isChangingCircle, setIsChangingCircle] = useState(false);
    const [submittingCircle, setSubmittingCircle] = useState(false);
    const [showJapaneseNotice, setShowJapaneseNotice] = useState(true);

    // Close period dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target)) {
                setIsPeriodDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Circle Tracker Status
    const fetchStatus = async (targetPeriod = null) => {
        try {
            setLoading(true);
            const query = targetPeriod ? `?period=${encodeURIComponent(targetPeriod)}` : '';
            const res = await fetch(`/api/circle-tracker/status${query}`);
            const data = await res.json();
            setStatusData(data);
            if (data.cooldown_seconds_remaining > 0) {
                setCountdownSecs(data.cooldown_seconds_remaining);
            } else {
                setCountdownSecs(0);
            }
        } catch (err) {
            console.error('Failed to load circle status:', err);
            onNotify?.('Gagal memuat data Fans Club', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPeriod = async (periodKey) => {
        setIsPeriodDropdownOpen(false);
        setSelectedPeriod(periodKey);
        await fetchStatus(periodKey);
    };

    useEffect(() => {
        fetchStatus(selectedPeriod);
    }, []);

    // Live countdown timer for 3-hour refresh cooldown
    useEffect(() => {
        if (countdownSecs <= 0) return;

        const timer = setInterval(() => {
            setCountdownSecs(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdownSecs]);

    // Format remaining seconds into HH:MM:SS
    const formatCountdown = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Set Circle ID & Trigger Initial Fetch
    const handleSetCircle = async (e) => {
        e?.preventDefault();
        const trimmed = inputCircleId.trim();
        if (!trimmed) {
            onNotify?.('Silakan masukkan ID Circle Club terlebih dahulu.', 'warning');
            return;
        }

        setSubmittingCircle(true);
        try {
            const res = await fetch('/api/circle-tracker/set-circle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ circle_id: trimmed }),
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setStatusData(result.data);
                setCountdownSecs(result.data?.cooldown_seconds_remaining || 10800);
                setIsChangingCircle(false);
                setInputCircleId('');
                onNotify?.(result.message || 'Circle Club berhasil dihubungkan!', 'success');
            } else {
                onNotify?.(result.message || 'Gagal menghubungkan Circle Club. Pastikan ID terdaftar di Muxueuma.', 'error');
            }
        } catch (err) {
            console.error('Failed to set circle:', err);
            onNotify?.('Gagal menghubungi server untuk menghubungkan circle.', 'error');
        } finally {
            setSubmittingCircle(false);
        }
    };

    // Open change circle form
    const handleStartChangeCircle = () => {
        setInputCircleId(statusData?.circle_id || '');
        setIsChangingCircle(true);
    };

    // Cancel change circle form
    const handleCancelChangeCircle = () => {
        setIsChangingCircle(false);
        setInputCircleId('');
    };

    // Refresh Handler
    const handleRefresh = async () => {
        if (countdownSecs > 0) {
            onNotify?.('Tombol refresh data hanya dapat ditekan per 3 jam sekali.', 'warning');
            return;
        }

        setRefreshing(true);
        try {
            const res = await fetch('/api/circle-tracker/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const result = await res.json();

            if (res.ok && result.success) {
                setStatusData(result.data);
                setCountdownSecs(result.data.cooldown_seconds_remaining || 10800);
                onNotify?.(result.message || 'Data Fans Club berhasil diperbarui!', 'success');
            } else {
                if (result.data) {
                    setStatusData(result.data);
                    setCountdownSecs(result.data.cooldown_seconds_remaining || 0);
                }
                onNotify?.(result.message || 'Tidak dapat memperbarui data', 'error');
            }
        } catch (err) {
            console.error('Refresh failed:', err);
            onNotify?.('Gagal menghubungi server untuk refresh', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    // Track Player change
    const handleTrackPlayer = async (viewerId) => {
        try {
            const res = await fetch('/api/circle-tracker/track-player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viewer_id: String(viewerId) }),
            });
            const result = await res.json();
            if (res.ok && result.data) {
                setStatusData(result.data);
                onNotify?.(result.message || 'Akun pemain terpilih berhasil diperbarui!', 'success');
            }
        } catch (err) {
            console.error('Failed to set tracked player:', err);
            onNotify?.('Gagal memperbarui akun pemain terpilih', 'error');
        }
    };

    if (loading && !statusData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                    Menghubungi data Circle muxueuma.com...
                </p>
            </div>
        );
    }

    // Pre-scraping Form State: If no circle is set or user chose to change circle
    if (!statusData?.has_circle || isChangingCircle) {
        return (
            <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
                {/* Hero Header Card */}
                <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-green-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/40">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/40 text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            <span>Circle Fans Club Tracker</span>
                        </span>
                        {isChangingCircle && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-xs font-bold text-amber-300">
                                Mode Ganti Circle
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        {isChangingCircle ? 'Ganti ID Circle Club' : 'Hubungkan Circle Club (Muxueuma.com)'}
                    </h1>
                    <p className="text-emerald-200/90 text-sm mt-2 max-w-2xl leading-relaxed">
                        Masukkan ID Circle Club Anda untuk melacak peringkat bulanan, total perolehan fans, kontribusi anggota, dan progres target fans bulanan secara otomatis.
                    </p>
                </div>

                {/* Input & Form Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <form onSubmit={handleSetCircle} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                ID Circle Club (Muxueuma) <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={inputCircleId}
                                        onChange={(e) => setInputCircleId(e.target.value)}
                                        placeholder="Contoh: 441730573"
                                        className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-400 text-base"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submittingCircle || !inputCircleId.trim()}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                >
                                    <RefreshCw className={`w-4 h-4 ${submittingCircle ? 'animate-spin' : ''}`} />
                                    <span>{submittingCircle ? 'Menghubungkan...' : 'Ambil Data Circle'}</span>
                                </button>
                                {isChangingCircle && (
                                    <button
                                        type="button"
                                        onClick={handleCancelChangeCircle}
                                        className="px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all cursor-pointer shrink-0"
                                    >
                                        Batal
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Masukkan nomor ID Circle yang tertera pada direktori atau profil circle di situs Muxueuma.
                            </p>
                        </div>
                    </form>

                    {/* External Link Quick Access Cards */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
                            Tautan Resmi Muxueuma
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <a
                                href="https://muxueuma.com/ja"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            Daftar Circle Terdaftar
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                            <span>https://muxueuma.com/ja</span>
                                        </div>
                                    </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
                            </a>

                            <a
                                href="https://muxueuma.com/ja/apply"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700/50 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                            Pendaftaran Circle (Apply)
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                            <span>https://muxueuma.com/ja/apply</span>
                                        </div>
                                    </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0 ml-2" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Important Instructions & Guidelines Card */}
                <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-3xl p-6 sm:p-7 border border-amber-200/80 dark:border-amber-800/40 space-y-4">
                    <div className="flex items-start gap-3.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-2.5">
                            <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">
                                Petunjuk Pendaftaran & Kebijakan Data Muxueuma (サークル収録申請)
                            </h3>
                            <ul className="text-xs text-amber-900/90 dark:text-amber-300/90 space-y-2.5 list-disc pl-4 leading-relaxed">
                                <li>
                                    <strong>Circle Belum Terdaftar di Muxueuma?</strong> Jika data circle Anda belum pernah dicatat di Muxueuma, maka perwakilan circle harus melakukan registrasi/apply terlebih dahulu di tautan resmi <a href="https://muxueuma.com/ja/apply" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-950 dark:hover:text-white">https://muxueuma.com/ja/apply</a> sebelum datanya dapat ditarik ke aplikasi ini.
                                </li>
                                <li>
                                    <strong>Syarat Pendaftaran:</strong> Pendaftaran membutuhkan pengisian <strong>Trainer ID</strong> pemohon pada formulir registrasi Muxueuma.
                                </li>
                                <li>
                                    <strong>Waktu Mulai Pengambilan Data:</strong> Pengambilan data riwayat fans baru dimulai <em>setelah</em> proses pencatatan/pendaftaran di Muxueuma berhasil. Riwayat performa sebelum masa pendaftaran tidak dapat ditarik secara retroaktif karena keterbatasan teknis sistem permainan.
                                </li>
                                <li>
                                    <strong>Transparansi Informasi:</strong> Di situs Muxueuma, jumlah fans seluruh member circle dan kontribusi bulanan ditampilkan secara terbuka untuk umum.
                                </li>
                                <li>
                                    <strong>Penyamaran Nama Circle (Opsional):</strong> Jika nama circle Anda tidak ingin dapat dicari trainer lain di dalam game, sebagian huruf nama circle dapat diganti dengan tanda bintang <code>*</code> (contoh: <code>「ヴィブロス～☆！」→「ヴィ**ス～☆！」</code>). Silakan kirimkan email permohonan ke <a href="mailto:ruijiergadena@gmail.com" className="underline font-bold font-mono">ruijiergadena@gmail.com</a> dengan melampirkan screenshot keanggotaan circle di dalam game.
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Official Japanese Notice Box (Collapsible) */}
                    <div className="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-800/40">
                        <button
                            type="button"
                            onClick={() => setShowJapaneseNotice(!showJapaneseNotice)}
                            className="flex items-center justify-between w-full text-xs font-bold text-amber-900 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span>Teks Petunjuk Resmi Muxueuma (サークル収録申請 - Bahasa Jepang)</span>
                            </span>
                            {showJapaneseNotice ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showJapaneseNotice && (
                            <div className="mt-3 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-amber-800/30 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed space-y-2">
                                <div className="font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                                    <span>サークル収録申請</span>
                                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">muxueuma.com/ja/apply</span>
                                </div>
                                <div>
                                    データの取得は収録後から始まります。収録より前の履歴は取得できません。技術的にさかのぼって取得することができません。あらかじめご了承くださいますようお願いいたします。
                                </div>
                                <div>
                                    本サイトでは、サークルメンバー全員のファン数と月間の貢献を公開しています。サークル名をゲーム内で他のトレーナーに検索されたくない場合は、サークル名の一部の文字を「*」に置き換えて表示することができます（例：「ヴィブロス～☆！」→「ヴィ**ス～☆！」）。 ご希望の際は、そのサークルのメンバーであることを確認できるゲーム内のスクリーンショットを添えて、こちらまでご連絡ください：
                                    <a href="mailto:ruijiergadena@gmail.com" className="font-mono text-emerald-600 dark:text-emerald-400 underline font-bold ml-1">
                                        ruijiergadena@gmail.com
                                    </a>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    ※ 申請時には「トレーナーID」の入力が必要です。
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // If circle exists but has no data
    if (statusData?.has_circle && !statusData?.has_data) {
        return (
            <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto py-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        Data Circle #{statusData?.circle_id} Belum Ditemukan di Muxueuma
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                        ID circle tersebut belum terdaftar di database Muxueuma.com atau proses scraping mengalami kendala. Pastikan circle sudah diajukan pendaftarannya di situs Muxueuma.
                    </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleStartChangeCircle}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                        Ganti ID Circle
                    </button>
                    <a
                        href="https://muxueuma.com/ja/apply"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-3 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-700/50 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>Ajukan di Muxueuma (Apply)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
        );
    }

    const circleName = statusData?.circle_name || 'なんか適当';
    const circleId = statusData?.circle_id || '441730573';
    const memberCount = statusData?.member_count || 30;
    const currentRank = statusData?.rank || 986;
    const currentPoint = statusData?.point || 0;
    const activeTotal = statusData?.active_total || 0;
    const period = statusData?.period || '2026-10-01';
    const isCurrentPeriod = statusData?.is_current_period ?? true;
    const trackedPlayer = statusData?.tracked_player;
    const members = statusData?.members || [];
    const canRefresh = isCurrentPeriod && countdownSecs === 0 && !refreshing;



    // Filter & Sort Members
    const filteredMembers = members
        .filter(m => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                (m.playerName && m.playerName.toLowerCase().includes(q)) ||
                (m.viewerId && String(m.viewerId).includes(q))
            );
        })
        .sort((a, b) => {
            if (sortBy === 'rank') {
                const isOutA = !a.rank || a.isVoided;
                const isOutB = !b.rank || b.isVoided;
                if (isOutA && !isOutB) return 1;
                if (!isOutA && isOutB) return -1;
                if (isOutA && isOutB) return (b.contribution ?? 0) - (a.contribution ?? 0);
                return sortAsc ? (a.rank - b.rank) : (b.rank - a.rank);
            }
            if (sortBy === 'playerName') {
                const valA = a.playerName ?? '';
                const valB = b.playerName ?? '';
                return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
            const valA = a[sortBy] ?? 0;
            const valB = b[sortBy] ?? 0;
            return sortAsc ? valA - valB : valB - valA;
        });

    const activeMembersCount = members.filter(m => m.rank && !m.isVoided).length;
    const outMembersCount = members.filter(m => !m.rank || m.isVoided).length;

    // Chart Data for Ranking Trend
    const chartData = (statusData?.trend_segments || []).flatMap(seg => 
        (seg.points || []).map(p => ({
            time: p.date ? String(p.date).slice(5) : '',
            rank: p.rank || 0,
            point: Math.round((p.point || 0) / 10000) / 100, // in Millions
            rawPoint: p.point || 0,
        }))
    );

    // Personal Progress toward Circle Goal
    const playerContribution = trackedPlayer?.contribution || 0;
    const quotaPercent = Math.min(200, Math.round((playerContribution / (circleGoal || 1)) * 100));

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Top Club Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-green-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/40">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-400/10 to-transparent pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/40 text-xs font-black text-amber-300 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-400" />
                                <span>Circle Fans Club</span>
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-600/30 text-xs font-mono font-bold text-emerald-200">
                                ID: {circleId}
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-600/30 text-xs font-medium text-emerald-200 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-emerald-400" />
                                <span>Periode: {formatPeriodJp(period)}</span>
                            </span>
                            {!isCurrentPeriod && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/25 border border-amber-400/50 text-xs font-bold text-amber-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-300" />
                                    <span>Mode Arsip Final</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                            <span>{circleName}</span>
                            <a 
                                href={`https://muxueuma.com/ja/circles/${circleId}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-emerald-300 hover:text-white transition-colors"
                                title="Lihat di muxueuma.com"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        </h1>

                        <p className="text-emerald-200/90 text-xs sm:text-sm mt-1 max-w-xl">
                            {isCurrentPeriod
                                ? 'Pantau perolehan fans keseluruhan club dan kontribusi pribadi anggota secara real-time via data muxueuma.'
                                : `Rekapitulasi arsip performa dan kontribusi anggota periode ${formatPeriodJp(period)} (${formatPeriodId(period)}).`}
                        </p>
                    </div>

                    {/* Actions: Ganti ID Club & Refresh Button & Cooldown */}
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            {!isCurrentPeriod && (
                                <button
                                    type="button"
                                    onClick={() => handleSelectPeriod(null)}
                                    className="px-4 py-3 rounded-2xl font-black text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    <span>Bulan Berjalan</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleStartChangeCircle}
                                className="px-4 py-3 rounded-2xl font-bold text-xs bg-emerald-950/80 hover:bg-emerald-800/90 text-emerald-200 border border-emerald-600/40 hover:border-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Ganti atau hubungkan ID Circle lain"
                            >
                                <Settings className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Ganti ID Club</span>
                            </button>

                            {isCurrentPeriod ? (
                                <button
                                    type="button"
                                    disabled={!canRefresh}
                                    onClick={handleRefresh}
                                    className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                                        canRefresh
                                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-400/20 active:scale-95'
                                            : 'bg-slate-800/80 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-950' : canRefresh ? 'text-slate-950' : 'text-slate-500'}`} />
                                    <span>
                                        {refreshing
                                            ? 'Memperbarui...'
                                            : canRefresh
                                                ? 'Perbarui Data Sekarang'
                                                : `Refresh Tersedia dalam ${formatCountdown(countdownSecs)}`}
                                    </span>
                                </button>
                            ) : (
                                <div className="px-4 py-3 rounded-2xl font-bold text-xs bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Arsip Final (Tersimpan)</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80 font-medium max-w-xs text-left md:text-right">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                            <span>
                                {!isCurrentPeriod
                                    ? 'Data historis ini bersifat permanen'
                                    : canRefresh 
                                        ? 'Data siap diperbarui dari server' 
                                        : `Pembaruan data hanya dapat dilakukan per 3 jam (${formatCountdown(countdownSecs)} tersisa)`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Archive Notification Alert (if viewing past month) */}
            {!isCurrentPeriod && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-200 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-xs">
                            <div className="font-black text-sm text-amber-800 dark:text-amber-300">
                                Sedang Melihat Arsip Periode: {formatPeriodJp(period)} ({formatPeriodId(period)})
                            </div>
                            <p className="text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                                Halaman ini menampilkan rekapitulasi akhir kontribusi anggota dan total fans pada bulan tersebut.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleSelectPeriod(null)}
                        className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                    >
                        <span>Kembali ke Bulan Berjalan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Daily Circle Pace & Run Estimator Widget */}
            <CirclePaceWidget 
                initialPaceData={statusData?.pace_estimator} 
                circleGoal={circleGoal} 
                isHistorical={!isCurrentPeriod}
                selectedPeriod={period}
                onBackToCurrent={() => handleSelectPeriod(null)}
            />

            {/* 4 Club KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* 1. Circle Rank */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ranking Club</span>
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Trophy className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">#{currentRank.toLocaleString()}</span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            Top Tier
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isCurrentPeriod ? 'Peringkat global bulan ini' : 'Peringkat global akhir periode'}
                    </p>
                </div>

                {/* 2. Total Points (Fans) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Fans Club</span>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Flame className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                            {(currentPoint).toLocaleString('id-ID')}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isCurrentPeriod
                            ? `~${((currentPoint) / 1000000).toFixed(1)} Juta Fans terkumpul`
                            : `Total perolehan fans periode ini`}
                    </p>
                </div>

                {/* 3. Active Total */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Total Fans</span>
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                            {(activeTotal).toLocaleString('id-ID')}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isCurrentPeriod
                            ? `~${((activeTotal) / 1000000).toFixed(1)} Juta fans aktif`
                            : `Active total fans periode ini`}
                    </p>
                </div>

                {/* 4. Total Anggota */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kapasitas Member</span>
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{memberCount} / 30</span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                            Penuh
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Semua kursi anggota terisi</p>
                </div>
            </div>

            {/* Personal Player Spotlight */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                                    Akun Pribadi Anda (Tracked Player)
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                {trackedPlayer?.playerName || 'Pemain Belum Terpilih'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                Viewer ID: {trackedPlayer?.viewerId || statusData?.tracked_viewer_id || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Personal Progress towards Monthly Circle Goal */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-[260px]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Target Kuota Bulanan ({((circleGoal) / 1000000).toFixed(0)}M):</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{quotaPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, quotaPercent)}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            <span>{((playerContribution) / 1000000).toFixed(2)}M fans</span>
                            <span>{((circleGoal) / 1000000).toFixed(0)}M fans</span>
                        </div>
                    </div>
                </div>

                {/* Personal Stats Grid */}
                {trackedPlayer ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
                        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Rank di Club</div>
                            <div className="text-xl font-black text-emerald-900 dark:text-emerald-300 font-mono mt-1">
                                #{trackedPlayer.rank || '-'}
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Dari 30 member</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                {isCurrentPeriod ? 'Kontribusi Bulan Ini' : `Kontribusi (${formatPeriodJp(period)})`}
                            </div>
                            <div className="text-xl font-black text-emerald-900 dark:text-emerald-300 font-mono mt-1">
                                +{(trackedPlayer.contribution || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                ~{((trackedPlayer.contribution || 0) / 1000000).toFixed(2)} Juta fans
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Perolehan Hari Ini</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                                +{(trackedPlayer.todayDelta || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Today delta</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">3 Hari Terakhir</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                                +{(trackedPlayer.day3Delta || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">3-day delta</div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">1 Minggu Terakhir</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                                +{(trackedPlayer.weekDelta || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Week delta</div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        Akun pemain Anda belum terpilih. Pilih pemain Anda pada daftar tabel di bawah dengan menekan tombol <strong>"Jadikan Akun Saya"</strong>.
                    </div>
                )}
            </div>

            {/* Ranking Trend Chart (7 Days) */}
            {chartData.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <span>Tren Peringkat & Perolehan Fans Club (7 Hari)</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Perkembangan total poin fans dan ranking club seiring berjalannya waktu</p>
                        </div>
                    </div>

                    <div className="h-64 sm:h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="clubPointGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis 
                                    dataKey="time" 
                                    stroke="#64748b" 
                                    fontSize={11} 
                                    tickLine={false} 
                                />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    unit="M"
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip 
                                    formatter={(value, name, props) => [
                                        `${(props.payload.rawPoint).toLocaleString('id-ID')} fans (Rank #${props.payload.rank})`,
                                        'Poin Club'
                                    ]}
                                    labelFormatter={(label) => `Waktu: ${label}`}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="point" 
                                    stroke="#059669" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#clubPointGradient)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Full Members Roster Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-visible">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Top Row: Japanese Title + Period Selector Dropdown (Gambar 1) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative pb-4 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
                                {formatPeriodJp(period)}のメンバー別貢献
                            </h2>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                ({formatPeriodId(period)})
                            </span>
                        </div>

                        {/* Period Selector Dropdown Trigger & Popover (Gambar 1) */}
                        <div className="relative" ref={periodDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1c1c1f] hover:bg-slate-200 dark:hover:bg-[#28282e] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 font-mono text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                                title="Pilih Periode Bulan"
                            >
                                <span>{formatPeriodJp(period)}</span>
                                <span className="text-[10px] text-slate-400">▾</span>
                            </button>

                            {/* Dropdown Popover matching Gambar 1 */}
                            {isPeriodDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] bg-[#1a1c23] dark:bg-[#18191e] border border-slate-700/80 dark:border-slate-800 rounded-xl shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-100">
                                    {groupedPeriods.sortedYears.map((yr) => (
                                        <div key={yr} className="space-y-2 mb-3 last:mb-0">
                                            <div className="text-xs text-slate-400 font-bold tracking-wider">
                                                {yr}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-5 pt-1">
                                                {groupedPeriods.map[yr].map((item) => {
                                                    const isSelected = activePeriodKey === item.key;
                                                    return (
                                                        <button
                                                            key={item.key}
                                                            type="button"
                                                            onClick={() => handleSelectPeriod(item.key)}
                                                            className={`text-sm font-bold pb-1 cursor-pointer transition-colors relative ${
                                                                isSelected 
                                                                    ? 'text-white' 
                                                                    : 'text-slate-400 hover:text-slate-200'
                                                            }`}
                                                        >
                                                            <span>{item.month}月</span>
                                                            {isSelected && (
                                                                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#e07a5f] rounded-full" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sub-bar: メンバーのファン増加 + Search Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                メンバーのファン増加
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Pertambahan fans seluruh anggota circle ({activeMembersCount} aktif{outMembersCount > 0 ? `, ${outMembersCount} keluar` : ''})
                            </p>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama atau Viewer ID..."
                                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-b-3xl">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                                <th 
                                    onClick={() => { setSortBy('rank'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400"
                                >
                                    Rank {sortBy === 'rank' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th 
                                    onClick={() => { setSortBy('playerName'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400"
                                >
                                    Nama Anggota {sortBy === 'playerName' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th className="px-5 py-3.5">Viewer ID</th>
                                <th 
                                    onClick={() => { setSortBy('contribution'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400"
                                >
                                    Kontribusi {isCurrentPeriod ? 'Bulan Ini' : `(${formatPeriodJp(period)})`} {sortBy === 'contribution' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th 
                                    onClick={() => { setSortBy('todayDelta'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700"
                                >
                                    Hari Ini {sortBy === 'todayDelta' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th 
                                    onClick={() => { setSortBy('day3Delta'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700"
                                >
                                    3 Hari {sortBy === 'day3Delta' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th 
                                    onClick={() => { setSortBy('weekDelta'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700"
                                >
                                    1 Minggu {sortBy === 'weekDelta' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th 
                                    onClick={() => { setSortBy('totalFans'); setSortAsc(!sortAsc); }} 
                                    className="px-5 py-3.5 cursor-pointer hover:text-emerald-700"
                                >
                                    Total Fans {sortBy === 'totalFans' && (sortAsc ? '▲' : '▼')}
                                </th>
                                <th className="px-5 py-3.5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400 dark:text-slate-500">
                                        Tidak ada anggota yang cocok dengan pencarian.
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((member) => {
                                    const isTracked = String(member.viewerId) === String(statusData?.tracked_viewer_id);
                                    const isOut = !member.rank || member.isVoided;
                                    return (
                                        <tr 
                                            key={member.viewerId} 
                                            className={`transition-colors ${
                                                isTracked 
                                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 font-semibold border-y border-emerald-200/50 dark:border-emerald-700/50' 
                                                    : isOut
                                                        ? 'bg-rose-500/5 dark:bg-rose-950/20 hover:bg-rose-500/10 dark:hover:bg-rose-950/30'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <td className="px-5 py-3.5 font-mono font-bold">
                                                {isOut ? (
                                                    <span 
                                                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800" 
                                                        title="Tidak memiliki ranking (Sudah keluar dari club)"
                                                    >
                                                        ー
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                                                        member.rank === 1 ? 'bg-amber-400 text-slate-950 font-black shadow-xs' :
                                                        member.rank === 2 ? 'bg-slate-300 text-slate-900 font-bold' :
                                                        member.rank === 3 ? 'bg-amber-700 text-white font-bold' :
                                                        'text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                        {member.rank}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${isOut ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                                                            {member.playerName || '-'}
                                                        </span>
                                                        {isOut && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                Keluar (Out)
                                                            </span>
                                                        )}
                                                        {isTracked && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs">
                                                                Akun Saya
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isOut && (
                                                        <span className="text-[10px] text-rose-500/80 dark:text-rose-400/80 font-medium mt-0.5">
                                                            {member.leftOn 
                                                                ? `${member.leftOn.slice(5)} 脱退、貢献は除外済み (Sudah Keluar dari Club)` 
                                                                : '脱退、貢献は除外済み (Sudah Keluar dari Club)'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                                                {member.viewerId}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono font-black text-emerald-700 dark:text-emerald-400">
                                                +{(member.contribution || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-200">
                                                {member.todayDelta !== null && member.todayDelta !== undefined
                                                    ? `+${(member.todayDelta).toLocaleString('id-ID')}`
                                                    : 'ー'}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-200">
                                                {member.day3Delta !== null && member.day3Delta !== undefined
                                                    ? `+${(member.day3Delta).toLocaleString('id-ID')}`
                                                    : 'ー'}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-200">
                                                {member.weekDelta !== null && member.weekDelta !== undefined
                                                    ? `+${(member.weekDelta).toLocaleString('id-ID')}`
                                                    : 'ー'}
                                            </td>
                                            <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                                                {(member.totalFans || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {isTracked ? (
                                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 justify-end">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <span>Terpilih</span>
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTrackPlayer(member.viewerId)}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        Jadikan Akun Saya
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
