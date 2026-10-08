import React, { useState } from 'react';
import { 
    ArrowLeft, 
    Trophy, 
    Shield, 
    Calendar, 
    Clock, 
    MapPin, 
    Route, 
    ExternalLink, 
    Dices, 
    HelpCircle, 
    Zap, 
    ChevronRight, 
    Sparkles, 
    AlertTriangle, 
    Info, 
    CheckCircle2, 
    ChevronLeft,
    TrendingUp,
    Heart,
    Flame,
    Gauge
} from 'lucide-react';
import { 
    SURFACE_MAP, 
    DISTANCE_CATEGORY_MAP, 
    DIRECTION_MAP, 
    SEASON_MAP, 
    TIME_MAP, 
    WEATHER_MAP, 
    TRACK_CONDITION_MAP,
    getEventStatus 
} from '../utils/competitionEventHelper';
import { getRecommendedGreenSkills } from '../utils/greenSkillHelper';
import SkillDetailModal from './SkillDetailModal';
import NoDebuffSkillsModal from './NoDebuffSkillsModal';

/**
 * Subcomponent: Stat boost pill for green skills
 */
function StatPill({ stat, value = '+40' }) {
    switch (stat) {
        case 'Speed':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <TrendingUp className="w-3 h-3" />
                    <span>Speed {value}</span>
                </span>
            );
        case 'Stamina':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <Heart className="w-3 h-3" />
                    <span>Stamina {value}</span>
                </span>
            );
        case 'Power':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Flame className="w-3 h-3" />
                    <span>Power {value}</span>
                </span>
            );
        case 'Guts':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    <Flame className="w-3 h-3" />
                    <span>Guts {value}</span>
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-3 h-3" />
                    <span>{stat} {value}</span>
                </span>
            );
    }
}

/**
 * Subcomponent: "Belum diumumkan" pill
 */
function NotAnnouncedPill() {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span>Belum diumumkan</span>
        </span>
    );
}

/**
 * Subcomponent: Distinctive "Acak (Random)" Badge
 */
function RandomBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 border border-amber-500/80 shadow-2xs">
            <Dices className="w-3.5 h-3.5 shrink-0" />
            <span>Acak (Random)</span>
        </span>
    );
}

export default function CompetitionEventDetailView({ event, onBack, activeDate }) {
    const [selectedSkillModal, setSelectedSkillModal] = useState(null);
    const [showNoDebuffModal, setShowNoDebuffModal] = useState(false);

    if (!event) return null;

    const isCM = event.event_type === 'champions_meeting';
    const isLoH = event.event_type === 'league_of_heroes';
    const hasNoDebuff = event.special_rule === 'no_debuff';

    const eventStatus = activeDate ? getEventStatus(event, activeDate) : null;
    const isOngoing = eventStatus?.status === 'ongoing';
    const isUpcoming = eventStatus?.status === 'upcoming';
    const isPast = eventStatus?.status === 'past';

    // Condition Matrix
    const conditions = [
        { label: 'Lokasi (Venue)', value: event.venue ? `${event.venue} (競馬場)` : null },
        { 
            label: 'Tipe Lintasan', 
            value: event.surface ? (event.surface === 'turf' ? 'Rumput (Turf / 芝)' : 'Tanah (Dirt / ダート)') : null,
            isTurf: event.surface === 'turf',
            isDirt: event.surface === 'dirt'
        },
        { 
            label: 'Jarak Balapan', 
            value: event.distance ? `${event.distance} Meter` : null 
        },
        { 
            label: 'Kategori Jarak', 
            value: event.distance_category ? (DISTANCE_CATEGORY_MAP[event.distance_category]?.sub || event.distance_category) : null 
        },
        { 
            label: 'Arah Putaran', 
            value: event.direction ? `${DIRECTION_MAP[event.direction]?.label || event.direction} (${DIRECTION_MAP[event.direction]?.sub || ''})` : null 
        },
        { 
            label: 'Musim', 
            value: event.season ? `${SEASON_MAP[event.season]?.label} (${SEASON_MAP[event.season]?.sub})` : null 
        },
        { 
            label: 'Waktu Balapan', 
            value: event.time_of_day ? `${TIME_MAP[event.time_of_day]?.label} (${TIME_MAP[event.time_of_day]?.sub})` : null 
        },
        { 
            label: 'Cuaca', 
            value: event.weather, 
            isRandom: event.weather === 'random',
            display: event.weather && event.weather !== 'random' ? `${WEATHER_MAP[event.weather]?.label} (${WEATHER_MAP[event.weather]?.sub})` : null
        },
        { 
            label: 'Kondisi Lintasan', 
            value: event.track_condition, 
            isRandom: event.track_condition === 'random',
            display: event.track_condition && event.track_condition !== 'random' ? `${TRACK_CONDITION_MAP[event.track_condition]?.label} (${TRACK_CONDITION_MAP[event.track_condition]?.sub})` : null
        },
    ];

    // Green Skills recommendation result
    const greenSkillResult = getRecommendedGreenSkills(event);

    return (
        <div className="space-y-6 pb-12 animate-fadeIn">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-500 transition-all cursor-pointer shadow-xs w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Daftar Event</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Event Planner</span>
                    <span>/</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
                        {event.event_name}
                    </span>
                </div>
            </div>

            {/* Main Event Header Card */}
            <div className={`p-6 sm:p-8 rounded-3xl text-white shadow-xl border overflow-hidden relative ${
                isCM 
                    ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 border-amber-500/30' 
                    : 'bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-800 border-indigo-500/30'
            }`}>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-xs uppercase tracking-wider">
                                {isCM ? <Trophy className="w-3.5 h-3.5 text-amber-200" /> : <Shield className="w-3.5 h-3.5 text-indigo-200" />}
                                <span>{isCM ? 'Champions Meeting' : 'League of Heroes'}</span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-black/25">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{event.date_label}</span>
                            </span>

                            {isOngoing && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-md animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-white" />
                                    <span>Event Sedang Berlangsung</span>
                                </span>
                            )}

                            {isUpcoming && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Berlangsung Nanti{eventStatus?.diffDays ? ` (${eventStatus.diffDays} hari lagi)` : ''}</span>
                                </span>
                            )}

                            {isPast && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/40 text-slate-300">
                                    <span>Telah Selesai</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                            {event.event_name}
                        </h1>

                        <p className="text-white/80 text-xs sm:text-sm font-medium max-w-2xl">
                            {isCM 
                                ? 'Kompetisi PvP Champions Meeting 9 peserta (3 vs 3 vs 3). Maksimalkan strategi dan stat karakter sesuai rincian kondisi resmi balapan.'
                                : 'Kompetisi tim League of Heroes 12 peserta (3 trainer + 6 NPC). Kumpulkan poin setinggi mungkin dalam setiap ronde pertandingan.'}
                        </p>
                    </div>

                    {/* Official Source Link Pill */}
                    <div className="shrink-0 flex md:flex-col items-start md:items-end justify-between gap-2">
                        <div className="text-xs text-white/70">Sumber Pengumuman Resmi:</div>
                        <a
                            href={event.source_url || 'https://umamusume.jp/news/detail?id=3483'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white font-bold text-xs transition-colors cursor-pointer border border-white/20 shadow-xs"
                        >
                            <span>Cygames JP Portal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>

                {/* Background decorative glow */}
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Special Rule Box (if applicable, e.g. No Debuff) */}
            {hasNoDebuff && (
                <div className="p-5 sm:p-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 dark:bg-rose-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-2xl bg-rose-500 text-white shrink-0 mt-0.5">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <span className="font-black text-rose-900 dark:text-rose-200 text-sm sm:text-base">
                                Aturan Khusus: No Debuff (デバフなし)
                            </span>
                            <p className="text-xs sm:text-sm text-rose-800/90 dark:text-rose-300/90 leading-relaxed max-w-3xl">
                                Pada gelaran Champions Meeting MILE Akhir Maret 2027 ini, seluruh 55 skill debuff dinonaktifkan secara resmi sesuai aturan Cygames. Seluruh efek penurunan kecepatan, stamina drain, dan gangguan pandangan tidak akan aktif.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowNoDebuffModal(true)}
                        className="shrink-0 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                        <Zap className="w-4 h-4" />
                        <span>Buka Daftar 55 Skill Terlarang</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Condition Matrix */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <Route className="w-4 h-4 text-emerald-500" />
                        <span>Rincian Kondisi Lomba Terkonfirmasi</span>
                    </h3>
                    <span className="text-xs text-slate-400 italic">
                        Cygames Official Announcement
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {conditions.map((c, i) => (
                        <div 
                            key={i} 
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                        >
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {c.label}
                            </span>
                            <div className="text-right">
                                {c.isRandom ? (
                                    <RandomBadge />
                                ) : c.display ? (
                                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                        {c.display}
                                    </span>
                                ) : c.value ? (
                                    <span className={`text-xs sm:text-sm font-black ${
                                        c.isTurf ? 'text-emerald-600 dark:text-emerald-400' :
                                        c.isDirt ? 'text-amber-600 dark:text-amber-400' :
                                        'text-slate-900 dark:text-white'
                                    }`}>
                                        {c.value}
                                    </span>
                                ) : (
                                    <NotAnnouncedPill />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* GREEN SKILLS SECTION */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-500">
                                <Sparkles className="w-5 h-5" />
                            </span>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Green Skills
                            </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Knowing the parameters, you can take advantage of them when preparing your characters and aim for specific green skills (e.g. for Groundwork activation or just for the stats).
                        </p>
                    </div>

                    {greenSkillResult.isFullyConfirmed && (
                        <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Kondisi Lomba Lengkap</span>
                        </div>
                    )}
                </div>

                {/* Case 1: Unconfirmed / Incomplete Event Info */}
                {!greenSkillResult.isFullyConfirmed && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3.5">
                        <Info className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="space-y-1.5">
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-200">
                                Rekomendasi Green Skill Belum Tersedia
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {greenSkillResult.disclaimer}
                            </p>
                            <p className="text-[11px] text-slate-400 italic">
                                Sesuai prinsip integritas data (Zero Speculative Data), sistem tidak membuat rekomendasi spekulatif sebelum parameter sirkuit dan musim resmi diumumkan oleh Cygames.
                            </p>
                        </div>
                    </div>
                )}

                {/* Case 2: Confirmed Event */}
                {greenSkillResult.isFullyConfirmed && (
                    <div className="space-y-4">
                        {/* LoH Random Conditions Disclaimer Banner */}
                        {greenSkillResult.hasRandomConditions && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 dark:bg-amber-950/20 flex items-start gap-3.5">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                                <div className="space-y-1 text-xs">
                                    <h4 className="font-black text-amber-900 dark:text-amber-200 text-sm">
                                        Catatan Khusus League of Heroes: Cuaca & Kondisi Lintasan Acak
                                    </h4>
                                    <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                                        Pada gelaran League of Heroes, kondisi cuaca dan kondisi lintasan berganti secara acak di setiap balapan.
                                        Green skill cuaca dan kondisi trek berikut berstatus <strong className="text-amber-900 dark:text-amber-200">Dapat Diambil (Situasional)</strong>, bukan rekomendasi utama, karena tidak ada kepastian kondisi tersebut selalu aktif di setiap ronde.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* List of Green Skills (Image 2 style) */}
                        <div className="space-y-2.5">
                            {greenSkillResult.skills.map((skill) => {
                                const isRecommended = skill.recommendation_status === 'recommended';
                                const isSituational = skill.recommendation_status === 'situational';

                                return (
                                    <div
                                        key={skill.id}
                                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isRecommended
                                                ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/70 hover:border-emerald-500/40'
                                                : 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/70 dark:border-amber-800/40 hover:border-amber-400'
                                        }`}
                                    >
                                        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                                            {/* Skill Icon */}
                                            <div className="relative shrink-0 mt-0.5 sm:mt-0">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-950/20 dark:bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center overflow-hidden p-1">
                                                    <img
                                                        src={skill.icon_url}
                                                        alt={skill.name_en}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Skill Info */}
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                                        {skill.name_en}
                                                    </span>
                                                    {skill.name_jp && (
                                                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                            ({skill.name_jp})
                                                        </span>
                                                    )}

                                                    {/* Recommendation status badge */}
                                                    {isRecommended ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Direkomendasikan</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                            <Dices className="w-3 h-3" />
                                                            <span>Dapat Diambil (Situasional)</span>
                                                        </span>
                                                    )}

                                                    {/* Stat boost */}
                                                    {skill.stat && (
                                                        <StatPill stat={skill.stat} value={skill.value} />
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    {skill.desc_en}
                                                </p>
                                                {skill.desc_id && (
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                                        {skill.desc_id}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* More link / button (matching image 2) */}
                                        <div className="shrink-0 flex justify-end sm:justify-start">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSkillModal(skill.raw_skill || skill)}
                                                className="px-3.5 py-1.5 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors border border-emerald-500/40 flex items-center gap-1 cursor-pointer shadow-2xs"
                                                title="Lihat formula aktivasi & penskalaan detail GameTora"
                                            >
                                                <span>More</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Zero Speculative Data & Transparency Footer */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                    Prinsip Integritas Data Cygames Resmi (Zero Speculative Data)
                </p>
                <p className="text-[11px] leading-relaxed">
                    Kondisi event yang belum diumumkan secara resmi tetap bernilai NULL dan tidak diisi berdasarkan spekulasi atau pola historis masa lalu. Rekomendasi green skill diperbarui secara deterministik mengikuti kondisi sirkuit resmi.
                </p>
            </div>

            {/* Skill Detail Modal (Opened via "More" button) */}
            {selectedSkillModal && (
                <SkillDetailModal
                    skill={selectedSkillModal}
                    onClose={() => setSelectedSkillModal(null)}
                />
            )}

            {/* No Debuff Skills Modal */}
            {showNoDebuffModal && (
                <NoDebuffSkillsModal
                    onClose={() => setShowNoDebuffModal(false)}
                />
            )}
        </div>
    );
}
