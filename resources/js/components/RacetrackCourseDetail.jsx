import React, { useState } from 'react';
import { 
    Map, 
    ExternalLink, 
    Download, 
    Layers, 
    Maximize2, 
    CheckCircle2,
    Compass,
    Sparkles
} from 'lucide-react';
import { 
    PHASE_TRANSLATIONS, 
    OVERLAP_TRANSLATIONS,
    STAT_THRESHOLD_TRANSLATIONS,
    formatSlopeLabel, 
    formatSpurtLocations 
} from '../utils/racetrackHelper';

/**
 * Subcomponent: Color Rectangle Legend Item
 */
function LegendColorItem({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <span 
                className="w-4 h-2.5 rounded-xs shrink-0 shadow-2xs border border-black/10" 
                style={{ backgroundColor: color }} 
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {label}
            </span>
        </div>
    );
}

/**
 * Subcomponent: Image Icon Legend Item
 */
function LegendImageItem({ iconUrl, label, fallbackText }) {
    const [imgErr, setImgErr] = useState(false);

    return (
        <div className="flex items-center gap-2">
            {!imgErr ? (
                <img 
                    src={iconUrl} 
                    alt={label} 
                    onError={() => setImgErr(true)}
                    className="h-4 w-auto max-w-[20px] object-contain shrink-0" 
                    loading="lazy"
                />
            ) : (
                <span className="text-[10px] font-mono px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {fallbackText || '•'}
                </span>
            )}
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {label}
            </span>
        </div>
    );
}

/**
 * RacetrackCourseDetail Component
 * Renders the official GameTora racetrack layout diagram and detailed segment phases
 * translated into Indonesian, as requested.
 */
export default function RacetrackCourseDetail({ racetrackData, event }) {
    if (!racetrackData || !racetrackData.course) {
        return null;
    }

    const { track_name, track_name_ja, course, gametora_url } = racetrackData;
    const laps = course.laps || [];
    const hasMultipleLaps = laps.length > 1;

    // Selected Lap tab: 0 = All Laps, 1 = Lap 1, 2 = Lap 2, etc.
    const [selectedLap, setSelectedLap] = useState(0);
    const [showFullModal, setShowFullModal] = useState(false);

    // Current displayed diagram image
    let currentImgUrl = course.image_urls?.simple;
    let currentDownloadUrl = course.image_urls?.full;

    if (selectedLap > 0 && course.image_urls?.laps && course.image_urls.laps[selectedLap - 1]) {
        currentImgUrl = course.image_urls.laps[selectedLap - 1].url;
        currentDownloadUrl = course.image_urls.laps[selectedLap - 1].full_url;
    }

    // Direction subtitle
    const courseTypeLabel = course.inout_str === 'outer' 
        ? 'Luar (Outer Course)' 
        : course.inout_str === 'inner' 
            ? 'Dalam (Inner Course)' 
            : '';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <Map className="w-5 h-5" />
                        </span>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Layout & Fase Balapan Sirkuit: {track_name} {course.length}m
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terkonfirmasi Resmi</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Sirkuit resmi {track_name} ({track_name_ja}) • {course.length} Meter • {course.surface === 'turf' ? 'Rumput (Turf)' : 'Tanah (Dirt)'} {courseTypeLabel ? `• ${courseTypeLabel}` : ''}.
                    </p>
                </div>

                {/* GameTora Link */}
                <div className="flex items-center gap-2 shrink-0">
                    <a
                        href={gametora_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                        <span>Buka di GameTora</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Lap Selection Tabs & Download link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
                    <button
                        type="button"
                        onClick={() => setSelectedLap(0)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            selectedLap === 0
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Semua Putaran (All Laps)
                    </button>
                    {hasMultipleLaps && laps.map((lap) => (
                        <button
                            key={lap.lap}
                            type="button"
                            onClick={() => setSelectedLap(lap.lap)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                selectedLap === lap.lap
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Putaran {lap.lap} (Lap {lap.lap})
                        </button>
                    ))}
                </div>

                {currentDownloadUrl && (
                    <a
                        href={currentDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Diagram Resolusi Tinggi</span>
                    </a>
                )}
            </div>

            {/* Main Interactive Diagram & Legend Container */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 flex flex-col lg:flex-row gap-6 items-start">
                {/* Left Side: Legend */}
                <div className="w-full lg:w-72 shrink-0 space-y-4 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-xs">
                    <div className="font-black text-slate-800 dark:text-slate-200 text-sm border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Legenda Simbol & Fase</span>
                    </div>

                    {/* Terrain */}
                    <div className="space-y-1.5">
                        <div className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                            Tipe Lintasan (Terrain)
                        </div>
                        <div className="space-y-1 pl-1">
                            <LegendColorItem color="#009A17" label="Rumput (Turf)" />
                            <LegendColorItem color="#4E3524" label="Tanah (Dirt)" />
                        </div>
                    </div>

                    {/* Phases */}
                    <div className="space-y-1.5">
                        <div className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                            Fase Balapan (Phases)
                        </div>
                        <div className="space-y-1 pl-1">
                            <LegendColorItem color="#ffe119" label="Fase Awal (Early-Race)" />
                            <LegendColorItem color="#624cab" label="Fase Tengah (Mid-Race)" />
                            <LegendColorItem color="#42d4f4" label="Fase Akhir (Late-Race)" />
                            <LegendColorItem color="#e6194b" label="Spurt Terakhir (Last Spurt)" />
                        </div>
                    </div>

                    {/* Overlaps (if any) */}
                    {course.overlaps && course.overlaps.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                                Tumpang Tindih (Overlaps)
                            </div>
                            <div className="space-y-1 pl-1">
                                {course.overlaps.map((ov) => (
                                    <LegendColorItem 
                                        key={ov} 
                                        color="#f37d32" 
                                        label={OVERLAP_TRANSLATIONS[ov] || ov} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Segments */}
                    <div className="space-y-1.5">
                        <div className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                            Segmen Lintasan (Segments)
                        </div>
                        <div className="space-y-1 pl-1">
                            <LegendImageItem 
                                iconUrl="https://gametora.com/images/umamusume/racetracks/icons/straights.png" 
                                label="Trek Lurus (Straight)" 
                                fallbackText="↔" 
                            />
                            <LegendImageItem 
                                iconUrl="https://gametora.com/images/umamusume/racetracks/icons/corners.png" 
                                label="Tikungan (Corner)" 
                                fallbackText="↷" 
                            />
                        </div>
                    </div>

                    {/* Slopes */}
                    {course.slopes && course.slopes.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                                Kemiringan Lintasan (Slopes)
                            </div>
                            <div className="space-y-1 pl-1">
                                <LegendImageItem 
                                    iconUrl="https://gametora.com/images/umamusume/racetracks/icons/slopeUp.png" 
                                    label="Tanjakan (Uphill)" 
                                    fallbackText="▲" 
                                />
                                <LegendImageItem 
                                    iconUrl="https://gametora.com/images/umamusume/racetracks/icons/slopeDown.png" 
                                    label="Turunan (Downhill)" 
                                    fallbackText="▼" 
                                />
                                <LegendImageItem 
                                    iconUrl="https://gametora.com/images/umamusume/racetracks/icons/slopeLevel.png" 
                                    label="Datar (Neither)" 
                                    fallbackText="=" 
                                />
                            </div>
                        </div>
                    )}

                    {/* Other Markers */}
                    <div className="space-y-1.5">
                        <div className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                            Penanda Khusus Lainnya (Other)
                        </div>
                        <div className="space-y-1 pl-1">
                            <LegendImageItem 
                                iconUrl="https://gametora.com/images/umamusume/racetracks/icons/positionKeepEnd.png" 
                                label="Akhir Pertahankan Posisi (Position Keep Ends)" 
                                fallbackText="🚩" 
                            />
                            <LegendImageItem 
                                iconUrl="https://gametora.com/images/umamusume/racetracks/icons/spurtStart.png" 
                                label="Awal Spurt (Spurt Starts)" 
                                fallbackText="⏩" 
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Diagram Graphic */}
                <div className="flex-1 w-full flex flex-col items-center justify-center p-2 sm:p-4 min-h-[320px] relative">
                    <div className="relative group max-w-full">
                        <img
                            src={currentImgUrl}
                            alt={`${track_name} ${course.length}m`}
                            className="max-h-[460px] w-auto object-contain rounded-2xl drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="eager"
                        />
                        <button
                            type="button"
                            onClick={() => setShowFullModal(true)}
                            className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer opacity-80 group-hover:opacity-100 shadow-md"
                            title="Perbesar Diagram Sirkuit"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-3 text-center text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Arah putaran: {course.turn === 1 ? 'Searah jarum jam (Kanan / Right-Handed)' : 'Berlawanan jarum jam (Kiri / Left-Handed)'}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Structured Section: Phases & Distances Grid (Matching Image 2) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                        Rincian Segmen Jarak & Fase Balapan
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {/* 1. Phases Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                            <span>Fase Balapan (Phases)</span>
                            <span className="text-[10px] text-slate-400 font-mono">4 Fase</span>
                        </div>
                        <div className="space-y-2.5">
                            {course.phases?.map((ph) => {
                                const info = PHASE_TRANSLATIONS[ph.id] || { name: `Fase ${ph.id}`, color: '#94a3b8' };
                                return (
                                    <div key={ph.id} className="text-xs">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <span 
                                                className="w-2 h-2 rounded-full shrink-0" 
                                                style={{ backgroundColor: info.color }} 
                                            />
                                            <span>{info.name}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pl-3.5">
                                            Mulai: {ph.start} m • Selesai: {ph.end} m
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Corners Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                            <span>Tikungan (Corners)</span>
                            <span className="text-[10px] text-slate-400 font-mono">{course.corners?.length || 0} Tikungan</span>
                        </div>
                        <div className="space-y-2.5">
                            {course.corners && course.corners.length > 0 ? (
                                course.corners.map((c, idx) => (
                                    <div key={idx} className="text-xs">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            Tikungan {c.number} (Corner {c.number})
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                            Mulai: {c.start} m • Selesai: {c.end} m
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">Tidak ada tikungan</span>
                            )}
                        </div>
                    </div>

                    {/* 3. Slopes Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                            <span>Kemiringan (Slopes)</span>
                            <span className="text-[10px] text-slate-400 font-mono">{course.slopes?.length || 0} Titik</span>
                        </div>
                        <div className="space-y-2.5">
                            {course.slopes && course.slopes.length > 0 ? (
                                course.slopes.map((sl, idx) => (
                                    <div key={idx} className="text-xs">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                            <span>Kemiringan {idx + 1}</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                                sl.slope > 0 
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' 
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                                            }`}>
                                                {formatSlopeLabel(sl.slope)}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                            Mulai: {sl.start} m • Selesai: {sl.end} m
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">Lintasan datar (tidak ada tanjakan)</span>
                            )}
                        </div>
                    </div>

                    {/* 4. Straights Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                            <span>Trek Lurus (Straights)</span>
                            <span className="text-[10px] text-slate-400 font-mono">{course.straights?.length || 0} Bagian</span>
                        </div>
                        <div className="space-y-2.5">
                            {course.straights && course.straights.length > 0 ? (
                                course.straights.map((st, idx) => (
                                    <div key={idx} className="text-xs">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            Trek Lurus {idx + 1} (Straight {idx + 1})
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                            Mulai: {st.start} m • Selesai: {st.end} m
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">Tidak ada trek lurus</span>
                            )}
                        </div>
                    </div>

                    {/* 5. Other Special Markers Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                            <span>Penanda Khusus (Other)</span>
                        </div>
                        <div className="space-y-3 text-xs">
                            {/* Position Keep */}
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                    Pertahankan Posisi (Position Keep)
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    Mulai: 0 m • Selesai: {course.positionKeepEnd} m
                                </div>
                            </div>

                            {/* Spurt */}
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                    Awal Spurt (Spurt Starts)
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    Mulai: {course.spurtStart?.meters || 0} m
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Lokasi: {formatSpurtLocations(course.spurtStart?.location)}
                                </div>
                            </div>

                            {/* Stat Thresholds */}
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                    Batas Ambang Stat (Thresholds)
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                                    {course.statThresholds && course.statThresholds.length > 0 ? (
                                        course.statThresholds.map((st) => STAT_THRESHOLD_TRANSLATIONS[st] || st).join(', ')
                                    ) : (
                                        <span className="text-slate-400 italic">Tidak ada ambang stat</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Zoom Diagram */}
            {showFullModal && (
                <div 
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowFullModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 p-4 rounded-3xl max-w-4xl max-h-[90vh] overflow-auto relative space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h4 className="font-black text-slate-900 dark:text-white text-base">
                                Diagram Sirkuit {track_name} {course.length}m {courseTypeLabel}
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowFullModal(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                            >
                                Tutup (ESC)
                            </button>
                        </div>
                        <div className="flex justify-center p-2">
                            <img
                                src={currentDownloadUrl || currentImgUrl}
                                alt={`${track_name} ${course.length}m`}
                                className="max-h-[70vh] w-auto object-contain rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
