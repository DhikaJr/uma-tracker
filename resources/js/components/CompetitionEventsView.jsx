import React, { useState, useEffect, useMemo } from 'react';
import { 
    CalendarDays, 
    Trophy, 
    Shield, 
    MapPin, 
    Route, 
    Compass, 
    Sun, 
    Cloud, 
    CloudRain, 
    Snowflake, 
    Dices, 
    ExternalLink, 
    CheckCircle2, 
    HelpCircle, 
    Sparkles, 
    RefreshCw, 
    X, 
    AlertCircle, 
    Layers, 
    Zap,
    ChevronRight,
    SlidersHorizontal,
    Info,
    Clock,
    Calendar,
    RotateCcw,
    PlayCircle,
    History
} from 'lucide-react';
import { formatIndonesianDate } from '../utils/dateHelper';
import NoDebuffSkillsModal from './NoDebuffSkillsModal';
import CompetitionEventDetailView from './CompetitionEventDetailView';

// Formatters and label dictionaries (Bilingual ID & JP)
const SURFACE_MAP = {
    turf: { label: 'Rumput', sub: 'Turf / 芝', color: 'emerald' },
    dirt: { label: 'Tanah', sub: 'Dirt / ダート', color: 'amber' },
};

const DISTANCE_CATEGORY_MAP = {
    sprint: { label: 'Sprint', sub: '短距離 (1000m - 1400m)' },
    mile: { label: 'Mile', sub: 'マイル (1500m - 1800m)' },
    middle: { label: 'Jarak Menengah', sub: '中距離 / Middle (2000m - 2400m)' },
    long: { label: 'Jarak Jauh', sub: '長距離 / Long (2500m+)' },
};

const DIRECTION_MAP = {
    right: { label: 'Kanan', sub: 'Right / 右' },
    left: { label: 'Kiri', sub: 'Left / 左' },
    right_outer: { label: 'Kanan • Luar', sub: 'Right Outer / 右・外' },
    right_inner: { label: 'Kanan • Dalam', sub: 'Right Inner / 右・内' },
    left_outer: { label: 'Kiri • Luar', sub: 'Left Outer / 左・外' },
    left_inner: { label: 'Kiri • Dalam', sub: 'Left Inner / 左・内' },
};

const SEASON_MAP = {
    spring: { label: 'Musim Semi', sub: 'Spring / 春' },
    summer: { label: 'Musim Panas', sub: 'Summer / 夏' },
    autumn: { label: 'Musim Gugur', sub: 'Autumn / 秋' },
    winter: { label: 'Musim Dingin', sub: 'Winter / 冬' },
};

const TIME_MAP = {
    day: { label: 'Siang Hari', sub: 'Day / 昼' },
    night: { label: 'Malam Hari', sub: 'Night / 夜' },
};

const WEATHER_MAP = {
    sunny: { label: 'Cerah', sub: 'Sunny / 晴', icon: Sun, color: 'text-amber-500' },
    cloudy: { label: 'Berawan', sub: 'Cloudy / 曇', icon: Cloud, color: 'text-slate-400' },
    rainy: { label: 'Hujan', sub: 'Rainy / 雨', icon: CloudRain, color: 'text-blue-500' },
    snowy: { label: 'Salju', sub: 'Snowy / 雪', icon: Snowflake, color: 'text-cyan-400' },
};

const TRACK_CONDITION_MAP = {
    good: { label: 'Baik', sub: 'Good / 良' },
    yielding: { label: 'Agak Lembap', sub: 'Yielding / 稍重' },
    soft: { label: 'Lembap / Berat', sub: 'Soft / 重' },
    heavy: { label: 'Buruk / Becek', sub: 'Heavy / 不良' },
};

/**
 * Calculates start and end dates (YYYY-MM-DD) for a competition event.
 */
function getEventScheduleRange(event) {
    if (event.start_date) {
        const start = new Date(event.start_date);
        // CM / LoH official duration in Cygames game: lasts ~6 days
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
            startStr: event.start_date,
            endStr: end.toISOString().slice(0, 10),
            startDate: start,
            endDate: end,
            hasExactStart: true,
        };
    }

    const y = event.year;
    const m = String(event.month).padStart(2, '0');
    let startDay = 1;
    let endDay = 10;

    if (event.period === 'late') {
        startDay = 21;
        endDay = new Date(y, event.month, 0).getDate();
    } else if (event.period === 'mid') {
        startDay = 11;
        endDay = 20;
    } else if (event.period === 'early') {
        startDay = 1;
        endDay = 10;
    } else {
        startDay = 1;
        endDay = new Date(y, event.month, 0).getDate();
    }

    const startStr = `${y}-${m}-${String(startDay).padStart(2, '0')}`;
    const endStr = `${y}-${m}-${String(endDay).padStart(2, '0')}`;

    return {
        startStr,
        endStr,
        startDate: new Date(startStr),
        endDate: new Date(endStr),
        hasExactStart: false,
    };
}

/**
 * Returns event status relative to active reference date:
 * 'ongoing' | 'upcoming' | 'past'
 */
function getEventStatus(event, activeDateStr) {
    const range = getEventScheduleRange(event);
    if (activeDateStr >= range.startStr && activeDateStr <= range.endStr) {
        return {
            status: 'ongoing',
            label: 'Event Sedang Berlangsung',
            range,
        };
    }
    if (activeDateStr < range.startStr) {
        const refDate = new Date(activeDateStr);
        const diffMs = range.startDate.getTime() - refDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
            status: 'upcoming',
            label: 'Berlangsung Nanti',
            diffDays: diffDays > 0 ? diffDays : null,
            range,
        };
    }
    return {
        status: 'past',
        label: 'Telah Selesai',
        range,
    };
}

export default function CompetitionEventsView({ onNotify }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'champions_meeting' | 'league_of_heroes'
    const [yearFilter, setYearFilter] = useState('all'); // 'all' | '2026' | '2027'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ongoing' | 'upcoming' | 'past'
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showNoDebuffModal, setShowNoDebuffModal] = useState(false);

    // Today's real date and simulation state
    const todayRealStr = new Date().toISOString().slice(0, 10);
    const [activeDate, setActiveDate] = useState(todayRealStr);
    const isSimulated = activeDate !== todayRealStr;

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/competition-events');
            if (!res.ok) {
                throw new Error(`HTTP Error ${res.status}: Gagal memuat jadwal event kompetisi`);
            }
            const json = await res.json();
            const list = Array.isArray(json) ? json : (json.data || []);
            setEvents(list);
        } catch (err) {
            console.error('Failed to fetch competition events:', err);
            setError(err.message || 'Gagal memuat jadwal kompetisi.');
            onNotify?.('Gagal memuat jadwal event kompetisi resmi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    // Filtered events list
    const filteredEvents = useMemo(() => {
        return events.filter((ev) => {
            if (typeFilter !== 'all' && ev.event_type !== typeFilter) return false;
            if (yearFilter !== 'all' && String(ev.year) !== yearFilter) return false;
            if (statusFilter !== 'all') {
                const s = getEventStatus(ev, activeDate).status;
                if (s !== statusFilter) return false;
            }
            return true;
        });
    }, [events, typeFilter, yearFilter, statusFilter, activeDate]);

    // Statistics based on active date
    const cmCount = events.filter(e => e.event_type === 'champions_meeting').length;
    const lohCount = events.filter(e => e.event_type === 'league_of_heroes').length;
    const ongoingCount = events.filter(e => getEventStatus(e, activeDate).status === 'ongoing').length;
    const upcomingCount = events.filter(e => getEventStatus(e, activeDate).status === 'upcoming').length;
    const pastCount = events.filter(e => getEventStatus(e, activeDate).status === 'past').length;
    const confirmedTracks = events.filter(e => e.venue && e.distance).length;

    // Handle opening event detail page in same tab
    const handleOpenDetail = (event) => {
        setSelectedEvent(event);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('event', String(event.id));
            window.history.pushState({ eventId: event.id }, '', url.toString());
        } catch {
            // ignore
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle back to event list
    const handleBackToList = () => {
        setSelectedEvent(null);
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('event');
            window.history.pushState({}, '', url.toString());
        } catch {
            // ignore
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Synchronize selected event with URL search params and history popstate
    useEffect(() => {
        const checkUrlEvent = () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const eventId = urlParams.get('event');
                if (eventId && events.length > 0) {
                    const found = events.find(e => String(e.id) === String(eventId));
                    if (found) {
                        setSelectedEvent(found);
                        return;
                    }
                }
                if (!eventId && selectedEvent) {
                    setSelectedEvent(null);
                }
            } catch {
                // ignore
            }
        };

        checkUrlEvent();
        window.addEventListener('popstate', checkUrlEvent);
        return () => window.removeEventListener('popstate', checkUrlEvent);
    }, [events]);

    // Dedicated Detail View in the same tab (not modal)
    if (selectedEvent) {
        return (
            <CompetitionEventDetailView
                event={selectedEvent}
                activeDate={activeDate}
                onBack={handleBackToList}
            />
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header & Meta */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Upcoming Competition Events
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Jadwal Resmi Champions Meeting (CM) & League of Heroes (LoH) Server JP 2026–2027
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Zero Speculative Data</span>
                    </span>
                    <button
                        type="button"
                        onClick={fetchEvents}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                        title="Muat Ulang Data Resmi"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Segarkan</span>
                    </button>
                </div>
            </div>

            {/* Date Reference & Simulation Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-2xl ${isSimulated ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'} shrink-0`}>
                        <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {isSimulated ? 'Tanggal Acuan (Simulasi Pengujian)' : 'Waktu Hari Ini'}
                            </span>
                            {isSimulated ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">
                                    Mode Uji Tanggal Aktif
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300">
                                    Hari Ini (Real)
                                </span>
                            )}
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                            <span>{formatIndonesianDate(activeDate, 'long')}</span>
                            <span className="font-mono text-xs font-semibold text-slate-400">({activeDate})</span>
                        </div>
                    </div>
                </div>

                {/* Date picker input & Quick Simulation Presets */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={activeDate}
                            onChange={(e) => {
                                if (e.target.value) setActiveDate(e.target.value);
                            }}
                            className="bg-transparent text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
                            title="Pilih tanggal acuan untuk simulasi event"
                        />
                    </div>

                    {/* Quick Simulation Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {isSimulated && (
                            <button
                                type="button"
                                onClick={() => setActiveDate(todayRealStr)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Kembalikan ke tanggal hari ini asli"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset Hari Ini</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveDate('2026-10-20')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeDate === '2026-10-20'
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400'
                                    : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                            }`}
                            title="Uji simulasi tanggal 20 Oktober 2026 (CM Classic Mulai)"
                        >
                            <span>Uji 20 Okt 2026 (CM Classic)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveDate('2026-11-25')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeDate === '2026-11-25'
                                    ? 'bg-indigo-600 text-white font-black shadow-xs ring-2 ring-indigo-400'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60'
                            }`}
                            title="Uji simulasi periode LoH Akhir November 2026"
                        >
                            <span>Uji Akhir Nov 2026 (LoH)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveDate('2026-12-25')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeDate === '2026-12-25'
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400'
                                    : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title="Uji simulasi periode CM Long Akhir Desember 2026"
                        >
                            <span>Akhir Des 2026</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Integrity Notice Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/50 to-blue-50 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-sky-200/80 dark:border-sky-800/60 shadow-xs">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-sky-500 text-white shrink-0 mt-0.5">
                        <Info className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 text-xs leading-relaxed text-sky-950 dark:text-sky-200">
                        <p className="font-bold text-sky-900 dark:text-sky-100">
                            Prinsip Integritas Data Resmi Cygames Portal JP
                        </p>
                        <p className="text-sky-800/90 dark:text-sky-300/90">
                            Seluruh data jadwal dan kondisi balapan di bawah ini diambil <strong>hanya dari pengumuman resmi portal Cygames</strong> (tanpa tebakan, prediksi wiki, atau data spekulatif). Parameter yang belum diumumkan secara resmi dipertahankan sebagai status <span className="font-semibold underline">Belum diumumkan</span>, dan parameter yang bersifat acak ditandai secara eksplisit dengan lencana <span className="font-semibold underline">Acak (Random)</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        <span>Total Jadwal</span>
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {events.length} <span className="text-xs font-semibold text-slate-500">Event Resmi</span>
                    </div>
                </div>

                {/* Sedang Berlangsung KPI */}
                <div className={`p-3.5 rounded-2xl shadow-2xs transition-all ${
                    ongoingCount > 0 
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500' 
                        : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
                }`}>
                    <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider ${
                        ongoingCount > 0 ? 'text-emerald-700 dark:text-emerald-300 font-black' : 'text-slate-400'
                    }`}>
                        <span>Sedang Berlangsung</span>
                        <PlayCircle className={`w-4 h-4 ${ongoingCount > 0 ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                    </div>
                    <div className={`text-xl sm:text-2xl font-black mt-1 ${
                        ongoingCount > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'
                    }`}>
                        {ongoingCount} <span className="text-xs font-semibold text-slate-500">Event Aktif</span>
                    </div>
                </div>

                {/* Berlangsung Nanti KPI */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                    <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
                        <span>Berlangsung Nanti</span>
                        <Clock className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                        {upcomingCount} <span className="text-xs font-semibold text-slate-500">Event Mendatang</span>
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        <span>Kondisi Trek Penuh</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {confirmedTracks} <span className="text-xs font-semibold text-slate-500">/ {events.length} Diumumkan</span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Filter:</span>
                    </span>

                    {/* Type Filter */}
                    <button
                        type="button"
                        onClick={() => setTypeFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            typeFilter === 'all'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Semua Tipe ({events.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTypeFilter('champions_meeting')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            typeFilter === 'champions_meeting'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                        }`}
                    >
                        <span>Champions Meeting</span>
                        <span className="text-[10px] opacity-75">({cmCount})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTypeFilter('league_of_heroes')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            typeFilter === 'league_of_heroes'
                                ? 'bg-indigo-600 text-white font-black shadow-xs'
                                : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/40'
                        }`}
                    >
                        <span>League of Heroes</span>
                        <span className="text-[10px] opacity-75">({lohCount})</span>
                    </button>

                    {/* Status Filter */}
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'ongoing' ? 'all' : 'ongoing')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            statusFilter === 'ongoing'
                                ? 'bg-emerald-600 text-white font-black shadow-xs'
                                : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                        }`}
                    >
                        <span>Sedang Berlangsung</span>
                        <span className="text-[10px] opacity-75">({ongoingCount})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            statusFilter === 'upcoming'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span>Berlangsung Nanti</span>
                        <span className="text-[10px] opacity-75">({upcomingCount})</span>
                    </button>
                </div>

                {/* Year Filter */}
                <div className="flex items-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Tahun:</span>
                    {['all', '2026', '2027'].map((yr) => (
                        <button
                            key={yr}
                            type="button"
                            onClick={() => setYearFilter(yr)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                yearFilter === yr
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-white/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white'
                            }`}
                        >
                            {yr === 'all' ? 'Semua' : yr}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading & Error States */}
            {loading && (
                <div className="py-16 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        Memuat data jadwal kompetisi resmi dari Cygames...
                    </p>
                </div>
            )}

            {error && !loading && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Event Timeline / Cards Grid */}
            {!loading && !error && filteredEvents.length === 0 && (
                <div className="py-16 text-center bg-white dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <HelpCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        Tidak ada event yang cocok dengan filter yang dipilih.
                    </p>
                </div>
            )}

            {!loading && !error && filteredEvents.length > 0 && (
                <div className="space-y-4">
                    {filteredEvents.map((event, idx) => (
                        <EventCard 
                            key={event.id || idx} 
                            event={event} 
                            index={idx + 1}
                            activeDate={activeDate}
                            onOpenDetail={() => handleOpenDetail(event)}
                            onOpenNoDebuff={() => setShowNoDebuffModal(true)}
                        />
                    ))}
                </div>
            )}

            {/* Special Rule: No Debuff Skills Modal */}
            {showNoDebuffModal && (
                <NoDebuffSkillsModal
                    onClose={() => setShowNoDebuffModal(false)}
                />
            )}
        </div>
    );
}

// Subcomponent: Event Card
function EventCard({ event, index, onOpenDetail, activeDate, onOpenNoDebuff }) {
    const isCM = event.event_type === 'champions_meeting';
    const isLoH = event.event_type === 'league_of_heroes';

    const surfaceInfo = event.surface ? SURFACE_MAP[event.surface] : null;
    const distCatInfo = event.distance_category ? DISTANCE_CATEGORY_MAP[event.distance_category] : null;
    const directionInfo = event.direction ? DIRECTION_MAP[event.direction] : null;
    const seasonInfo = event.season ? SEASON_MAP[event.season] : null;
    const timeInfo = event.time_of_day ? TIME_MAP[event.time_of_day] : null;

    // Check special rules
    const hasNoDebuff = event.special_rule === 'no_debuff';

    // Status relative to active reference date
    const eventStatus = getEventStatus(event, activeDate);
    const isOngoing = eventStatus.status === 'ongoing';
    const isUpcoming = eventStatus.status === 'upcoming';
    const isPast = eventStatus.status === 'past';

    // Card border and shadow styling:
    // When isOngoing is TRUE, apply the exact same active color as hover:
    // CM -> border-amber-400 with shadow-md
    // LoH -> border-indigo-400 with shadow-md
    // Plus ring and subtle tinted background to highlight active state
    const cardBorderAndShadowClass = isOngoing
        ? isCM
            ? 'border-amber-400 dark:border-amber-400 shadow-md ring-2 ring-amber-400/50 bg-amber-500/5 dark:bg-amber-500/10'
            : 'border-indigo-400 dark:border-indigo-400 shadow-md ring-2 ring-indigo-400/50 bg-indigo-500/5 dark:bg-indigo-500/10'
        : isCM
            ? 'border-amber-200/90 dark:border-amber-800/40 hover:border-amber-400 hover:shadow-md bg-white dark:bg-slate-800/90 shadow-xs'
            : 'border-indigo-200/90 dark:border-indigo-800/40 hover:border-indigo-400 hover:shadow-md bg-white dark:bg-slate-800/90 shadow-xs';

    return (
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 ${cardBorderAndShadowClass}`}>
            {/* Header: Badge, Title, Date Label, Special Rule, Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Index Sequence */}
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black flex items-center justify-center">
                        #{index}
                    </span>

                    {/* Event Type Badge */}
                    {isCM && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 flex items-center gap-1.5 shadow-2xs">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Champions Meeting</span>
                        </span>
                    )}
                    {isLoH && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-1.5 shadow-2xs">
                            <Shield className="w-3.5 h-3.5" />
                            <span>League of Heroes</span>
                        </span>
                    )}

                    {/* Status Badge */}
                    {isOngoing && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs ring-1 ring-emerald-400/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <span>Event Sedang Berlangsung</span>
                        </span>
                    )}
                    {isUpcoming && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Berlangsung Nanti{eventStatus.diffDays ? ` (${eventStatus.diffDays} hari lagi)` : ''}</span>
                        </span>
                    )}
                    {isPast && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Telah Selesai</span>
                        </span>
                    )}

                    {/* Event Name */}
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {event.event_name}
                    </h3>

                    {/* Special Rule Badge (Clickable to open NoDebuffSkillsModal) */}
                    {hasNoDebuff && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenNoDebuff?.();
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900/80 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 flex items-center gap-1.5 shadow-2xs animate-pulse cursor-pointer transition-all"
                            title="Klik untuk melihat aturan resmi dan daftar 55 skill debuff nonaktif"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Aturan Khusus: No Debuff (デバフなし)</span>
                            <ChevronRight className="w-3 h-3 opacity-70" />
                        </button>
                    )}
                </div>

                {/* Date Label Pill */}
                <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{event.date_label}</span>
                    </div>
                    {event.start_date && (
                        <span className="hidden sm:inline text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            (Mulai: {event.start_date})
                        </span>
                    )}
                </div>
            </div>

            {/* Body: Track & Racing Condition Cells */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5 py-3.5">
                {/* 1. Lokasi / Venue */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi (Venue)</span>
                    <div className="mt-1">
                        {event.venue ? (
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{event.venue}</span>
                            </span>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                    </div>
                </div>

                {/* 2. Lintasan / Surface */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lintasan (Surface)</span>
                    <div className="mt-1">
                        {surfaceInfo ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-black ${
                                event.surface === 'turf' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                                <Route className="w-3.5 h-3.5 shrink-0" />
                                <span>{surfaceInfo.label}</span>
                                <span className="text-[10px] font-medium opacity-75">({surfaceInfo.sub.split('/')[1]?.trim()})</span>
                            </span>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                    </div>
                </div>

                {/* 3. Jarak & Kategori */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jarak & Kategori</span>
                    <div className="mt-1">
                        {event.distance ? (
                            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-emerald-600 dark:text-emerald-400">{event.distance}m</span>
                                {distCatInfo && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                        {distCatInfo.label}
                                    </span>
                                )}
                            </div>
                        ) : event.distance_category ? (
                            <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                <span>{distCatInfo?.label || event.distance_category}</span>
                                <span className="text-[10px] text-slate-400 font-normal italic">
                                    (Meter belum diumumkan)
                                </span>
                            </div>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                    </div>
                </div>

                {/* 4. Arah Putaran */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arah Putaran</span>
                    <div className="mt-1">
                        {directionInfo ? (
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{directionInfo.label}</span>
                            </span>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                    </div>
                </div>

                {/* 5. Musim & Waktu */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Musim & Waktu</span>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {seasonInfo ? (
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                {seasonInfo.label}
                            </span>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                        {timeInfo && (
                            <span className="text-[11px] text-slate-500 font-medium">
                                • {timeInfo.label}
                            </span>
                        )}
                    </div>
                </div>

                {/* 6. Cuaca */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuaca</span>
                    <div className="mt-1">
                        {event.weather === 'random' ? (
                            <RandomBadge />
                        ) : event.weather && WEATHER_MAP[event.weather] ? (
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                {React.createElement(WEATHER_MAP[event.weather].icon, { className: `w-3.5 h-3.5 ${WEATHER_MAP[event.weather].color}` })}
                                <span>{WEATHER_MAP[event.weather].label}</span>
                            </span>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                    </div>
                </div>

                {/* 7. Kondisi Lintasan */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kondisi Trek</span>
                    <div className="mt-1">
                        {event.track_condition === 'random' ? (
                            <RandomBadge />
                        ) : event.track_condition && TRACK_CONDITION_MAP[event.track_condition] ? (
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                {TRACK_CONDITION_MAP[event.track_condition].label}
                            </span>
                        ) : (
                            <NotAnnouncedPill />
                        )}
                    </div>
                </div>
            </div>

            {/* Footer: Detail Action & Official Source Link */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="font-semibold">Sumber Resmi:</span>
                    <a
                        href={event.source_url || 'https://umamusume.jp/news/detail?id=3483'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                    >
                        <span>{event.source_name || 'Cygames Portal JP'}</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                <button
                    type="button"
                    onClick={onOpenDetail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-xs"
                >
                    <span>Lihat Rincian Lengkap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// Subcomponent: "Belum diumumkan" pill
function NotAnnouncedPill() {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
            <HelpCircle className="w-3 h-3 shrink-0 opacity-60" />
            <span>Belum diumumkan</span>
        </span>
    );
}

// Subcomponent: Distinctive "Acak (Random)" Badge
function RandomBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 border border-amber-500/80 shadow-2xs">
            <Dices className="w-3 h-3 shrink-0" />
            <span>Acak (Random)</span>
        </span>
    );
}

