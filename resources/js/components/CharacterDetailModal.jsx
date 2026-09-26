import React, { useState, useEffect } from 'react';
import SkillDetailModal from './SkillDetailModal';
import {
    X,
    Star,
    CheckCircle2,
    Sparkles,
    ShieldCheck,
    BookOpen,
    Layers,
    Zap,
    ArrowRight,
    User,
    Compass,
    Award,
    ExternalLink,
    Info,
    BarChart2,
    TrendingUp,
    Flag
} from 'lucide-react';

/**
 * Aptitude Grade color badge mapping
 * Canonical Uma Musume colors:
 * S: Fuchsia/Purple
 * A: Emerald Green
 * B: Sky Blue
 * C: Amber/Orange
 * D: Slate Gray
 * E-G: Rose/Red
 */
function getGradeBadge(grade) {
    const g = (grade || '-').toUpperCase().trim();
    switch (g) {
        case 'S':
            return {
                label: 'S',
                badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/80 dark:text-fuchsia-300 border-fuchsia-400 font-black',
                pill: 'bg-fuchsia-500 text-white',
            };
        case 'A':
            return {
                label: 'A',
                badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-400 font-black',
                pill: 'bg-emerald-600 text-white',
            };
        case 'B':
            return {
                label: 'B',
                badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-400 font-black',
                pill: 'bg-sky-600 text-white',
            };
        case 'C':
            return {
                label: 'C',
                badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-400 font-black',
                pill: 'bg-amber-600 text-white',
            };
        case 'D':
            return {
                label: 'D',
                badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400 font-black',
                pill: 'bg-slate-500 text-white',
            };
        case 'E':
        case 'F':
        case 'G':
            return {
                label: g,
                badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 font-bold',
                pill: 'bg-rose-600 text-white',
            };
        default:
            return {
                label: g,
                badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300',
                pill: 'bg-slate-400 text-white',
            };
    }
}

const STAT_ITEMS = [
    { key: 'speed', label: 'Speed', labelJp: 'スピード', icon: '/images/icons/utx_ico_obtain_00.png', fallback: 'https://gametora.com/images/umamusume/icons/utx_ico_obtain_00.png' },
    { key: 'stamina', label: 'Stamina', labelJp: 'スタミナ', icon: '/images/icons/utx_ico_obtain_01.png', fallback: 'https://gametora.com/images/umamusume/icons/utx_ico_obtain_01.png' },
    { key: 'power', label: 'Power', labelJp: 'パワー', icon: '/images/icons/utx_ico_obtain_02.png', fallback: 'https://gametora.com/images/umamusume/icons/utx_ico_obtain_02.png' },
    { key: 'guts', label: 'Guts', labelJp: '根性', icon: '/images/icons/utx_ico_obtain_03.png', fallback: 'https://gametora.com/images/umamusume/icons/utx_ico_obtain_03.png' },
    { key: 'wit', label: 'Wit', labelJp: '賢さ', icon: '/images/icons/utx_ico_obtain_04.png', fallback: 'https://gametora.com/images/umamusume/icons/utx_ico_obtain_04.png' },
];

function translateObjectiveTitle(title) {
    if (!title) return '';
    const t = String(title).replace(/^\d+\.\s*/, '').trim();

    // Have at least X fans
    let m = t.match(/^Have at least ([\d,]+) fans$/i);
    if (m) return `Kumpulkan minimal ${m[1]} fans`;

    // Participate in the <Race>
    m = t.match(/^Participate in the (.+)$/i);
    if (m) return `Ikuti balapan ${m[1]}`;

    // Participate in X G1 races
    m = t.match(/^Participate in (\d+) G1 races$/i);
    if (m) return `Ikuti ${m[1]} balapan tingkat G1`;

    // Participate in X graded/G2/G3 or higher races
    m = t.match(/^Participate in (\d+) (G2|G3|graded) or higher races$/i);
    if (m) return `Ikuti ${m[1]} balapan tingkat ${m[2] === 'graded' ? 'berperingkat (graded)' : m[2]} atau lebih tinggi`;

    // Place 1st in the <Race>
    m = t.match(/^Place 1st in the (.+)$/i);
    if (m) return `Raih Juara 1 di ${m[1]}`;

    // Place 1st in X G1 races
    m = t.match(/^Place 1st in (\d+) G1 races$/i);
    if (m) return `Raih Juara 1 di ${m[1]} balapan tingkat G1`;

    // Place 1st in X graded/G2/G3 or higher races
    m = t.match(/^Place 1st in (\d+) (G2|G3|graded) or higher races$/i);
    if (m) return `Raih Juara 1 di ${m[1]} balapan tingkat ${m[2] === 'graded' ? 'berperingkat (graded)' : m[2]} atau lebih tinggi`;

    // Place Nth or better in the <Race>
    m = t.match(/^Place (\d+)(?:st|nd|rd|th) or better in the (.+)$/i);
    if (m) return `Raih posisi ${m[1]} besar atau lebih baik di ${m[2]}`;

    // Place Nth or better in X G1 races
    m = t.match(/^Place (\d+)(?:st|nd|rd|th) or better in (\d+) G1 races$/i);
    if (m) return `Raih posisi ${m[1]} besar atau lebih baik di ${m[2]} balapan tingkat G1`;

    // Place Nth or better in X graded/G2/G3 or higher races
    m = t.match(/^Place (\d+)(?:st|nd|rd|th) or better in (\d+) (G2|G3|graded) or higher races$/i);
    if (m) return `Raih posisi ${m[1]} besar atau lebih baik di ${m[2]} balapan tingkat ${m[3] === 'graded' ? 'berperingkat (graded)' : m[3]} atau lebih tinggi`;

    // Career Objective X
    m = t.match(/^Career Objective (\d+)$/i);
    if (m) return `Target Karir ${m[1]}`;

    return t;
}

function translateTurnText(turnText) {
    if (!turnText) return '';
    const m = String(turnText).match(/^Turn (\d+)(?:\s*\(previous \+ (\d+)\))?$/i);
    if (m) {
        if (m[2]) {
            return `Giliran ${m[1]} (jeda +${m[2]} giliran)`;
        }
        return `Giliran ${m[1]}`;
    }
    return turnText.replace(/Turn/gi, 'Giliran').replace(/previous/gi, 'sebelumnya');
}

function translateClassPeriod(period) {
    if (!period) return '';
    return String(period)
        .replace(/Junior Class/gi, 'Tahun Junior')
        .replace(/Classic Class/gi, 'Tahun Klasik')
        .replace(/Senior Class/gi, 'Tahun Senior')
        .replace(/Finals/gi, 'Final (URA)')
        .replace(/Early/gi, 'Awal')
        .replace(/Late/gi, 'Akhir')
        .replace(/January/gi, 'Januari')
        .replace(/February/gi, 'Februari')
        .replace(/March/gi, 'Maret')
        .replace(/April/gi, 'April')
        .replace(/May/gi, 'Mei')
        .replace(/June/gi, 'Juni')
        .replace(/July/gi, 'Juli')
        .replace(/August/gi, 'Agustus')
        .replace(/September/gi, 'September')
        .replace(/October/gi, 'Oktober')
        .replace(/November/gi, 'November')
        .replace(/December/gi, 'Desember');
}

function translateTrackCondition(cond) {
    if (!cond) return '';
    return String(cond)
        .replace(/\bTurf\b/g, 'Rumput')
        .replace(/\bDirt\b/g, 'Pasir')
        .replace(/\bShort\b/g, 'Jarak Pendek')
        .replace(/\bMile\b/g, 'Mil')
        .replace(/\bMedium\b/g, 'Jarak Menengah')
        .replace(/\bLong\b/g, 'Jarak Jauh');
}

export default function CharacterDetailModal({ character, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('skills'); // 'skills' | 'stats' | 'aptitude' | 'objectives'
    const [selectedSkillModal, setSelectedSkillModal] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !character) return null;

    const name = character.name || 'Detail Karakter';
    const baseStars = character.base_stars || 3;
    const currentStars = character.current_stars || baseStars;
    const isOwned = character.is_owned;
    const imageUrl = character.image_url || character.icon_url;

    // Parse Title & Name from "Special Week [Special Dreamer]"
    let charBaseName = name;
    let charTitle = '';
    const match = name.match(/^(.*?)\s*\[(.*?)\]$/);
    if (match) {
        charBaseName = match[1].trim();
        charTitle = match[2].trim();
    }

    const rawData = typeof character.raw_data === 'string'
        ? (() => { try { return JSON.parse(character.raw_data); } catch (e) { return {}; } })()
        : (character.raw_data || {});

    const baseStats = character.base_stats || rawData.base_stats || null;
    const fiveStarStats = character.five_star_stats || rawData.five_star_stats || null;
    const statBonus = character.stat_bonus || rawData.stat_bonus || null;

    const aptitudes = typeof character.aptitudes === 'string'
        ? (() => { try { return JSON.parse(character.aptitudes); } catch (e) { return {}; } })()
        : (character.aptitudes || {});
    const skills = typeof character.skills === 'string'
        ? (() => { try { return JSON.parse(character.skills); } catch (e) { return {}; } })()
        : (character.skills || {});
    const objectives = typeof character.objectives === 'string'
        ? (() => { try { return JSON.parse(character.objectives); } catch (e) { return []; } })()
        : (character.objectives || []);

    // Support dual unique skills for base 1★ and 2★ characters (☆ and ☆☆ vs ☆☆☆+)
    const uniqueVersions = (skills.unique_versions && skills.unique_versions.length > 0)
        ? skills.unique_versions
        : (skills.unique ? [skills.unique] : []);
    const uniqueSkill = skills.unique || (uniqueVersions[0] ?? null);
    const innateSkills = skills.innate || [];
    const awakeningSkills = skills.awakening || [];
    const evolveSkills = skills.evolve || [];

    // Aptitude lists
    const trackList = [
        { key: 'turf', label: 'Turf (芝)', grade: aptitudes.turf || aptitudes.track?.turf || '-' },
        { key: 'dirt', label: 'Dirt (ダート)', grade: aptitudes.dirt || aptitudes.track?.dirt || '-' },
    ];

    const distanceList = [
        { key: 'short', label: 'Short (短距離)', grade: aptitudes.short || aptitudes.distance?.short || '-' },
        { key: 'mile', label: 'Mile (マイル)', grade: aptitudes.mile || aptitudes.distance?.mile || '-' },
        { key: 'medium', label: 'Medium (中距離)', grade: aptitudes.medium || aptitudes.distance?.medium || '-' },
        { key: 'long', label: 'Long (長距離)', grade: aptitudes.long || aptitudes.distance?.long || '-' },
    ];

    const styleList = [
        { key: 'runner', label: 'Runner (逃げ / Nige)', grade: aptitudes.runner || aptitudes.style?.runner || '-' },
        { key: 'leader', label: 'Leader (先行 / Senko)', grade: aptitudes.leader || aptitudes.style?.leader || '-' },
        { key: 'betweener', label: 'Betweener (差し / Sashi)', grade: aptitudes.betweener || aptitudes.style?.betweener || '-' },
        { key: 'chaser', label: 'Chaser (追込 / Oikomi)', grade: aptitudes.chaser || aptitudes.style?.chaser || '-' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog Content */}
            <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Uma Musume Emerald/Gold styling */}
                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-900 text-white p-5 sm:p-6 relative shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 pr-8">
                        {/* Avatar Picture */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-400/80 bg-emerald-950 shadow-md relative flex items-center justify-center">
                            <User className="w-8 h-8 text-emerald-300/40 absolute" />
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={name}
                                    className="w-full h-full object-cover object-top relative z-10"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : null}
                        </div>

                        {/* Title & Metadata */}
                        <div className="space-y-1 min-w-0">
                            {charTitle && (
                                <div className="text-xs sm:text-sm font-bold text-amber-300 font-mono tracking-wide truncate">
                                    [{charTitle}]
                                </div>
                            )}
                            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                                {charBaseName}
                            </h2>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                {/* Base Stars */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-amber-400 text-slate-950">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>Bawaan {baseStars}★</span>
                                </span>

                                {/* Current Stars */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-white/20 text-emerald-100 border border-white/20">
                                    <span>Saat Ini: {currentStars}★</span>
                                </span>

                                {/* Ownership Badge */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                                    isOwned
                                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                                        : 'bg-black/30 text-white/60 border-white/20'
                                }`}>
                                    <CheckCircle2 className={`w-3 h-3 ${isOwned ? 'text-emerald-300' : 'text-white/40'}`} />
                                    <span>{isOwned ? 'Sudah Dimiliki' : 'Belum Dimiliki'}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t border-emerald-600/60">
                        <button
                            type="button"
                            onClick={() => setActiveTab('skills')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'skills'
                                    ? 'bg-white text-emerald-900 shadow-md font-black'
                                    : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900/80 hover:text-white'
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Pohon Kemampuan (Skills)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('stats')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'stats'
                                    ? 'bg-white text-emerald-900 shadow-md font-black'
                                    : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900/80 hover:text-white'
                            }`}
                        >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Status & Bonus (Base Stats)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('aptitude')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'aptitude'
                                    ? 'bg-white text-emerald-900 shadow-md font-black'
                                    : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900/80 hover:text-white'
                            }`}
                        >
                            <Compass className="w-3.5 h-3.5" />
                            <span>Kesesuaian (Aptitude)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('objectives')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'objectives'
                                    ? 'bg-white text-emerald-900 shadow-md font-black'
                                    : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900/80 hover:text-white'
                            }`}
                        >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Target Karir (Objectives)</span>
                        </button>
                    </div>
                </div>

                {/* Modal Body: Scrollable */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {/* ======================================================== */}
                    {/* TAB 1: SKILLS & ABILITIES                                */}
                    {/* ======================================================== */}
                    {activeTab === 'skills' && (
                        <div className="space-y-6">
                            {/* Unique Skill Card (Gold gradient) */}
                            {/* Unique Skills (Supports 1★ & 2★ dual versions vs 3★+) */}
                            {uniqueVersions.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4" />
                                            <span>Unique skills (Kemampuan Unik)</span>
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300">
                                            {uniqueVersions.length > 1 ? 'Dual Version (1★/2★ & 3★+)' : `Rarity ${uniqueSkill?.rarity ?? 5}★ (Emas)`}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {uniqueVersions.map((uSkill, uIdx) => {
                                            const versionLabel = uSkill.version_label
                                                || (uniqueVersions.length > 1 ? (uIdx === 0 ? '☆ and ☆☆' : '☆☆☆+') : '☆☆☆+');
                                            return (
                                                <div
                                                    key={uSkill.id || uIdx}
                                                    onClick={() => setSelectedSkillModal(uSkill)}
                                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-colors group"
                                                    title="Klik untuk melihat detail skill lengkap"
                                                >
                                                    {/* Star Banner matching GameTora Header */}
                                                    <div className="bg-teal-50/80 dark:bg-slate-800/90 py-1.5 px-4 text-center border-b border-teal-100 dark:border-slate-800">
                                                        <span className="text-xs font-black text-amber-500 tracking-wider font-sans">
                                                            {versionLabel}
                                                        </span>
                                                    </div>

                                                    {/* Skill Content */}
                                                    <div className="p-3.5 sm:p-4 flex items-start gap-3.5">
                                                        {/* Left: Icon & Details */}
                                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                                            {uSkill.icon_url ? (
                                                                <img
                                                                    src={uSkill.icon_url}
                                                                    alt={uSkill.name}
                                                                    className="w-12 h-12 rounded-xl object-contain drop-shadow-sm border border-amber-300/60 p-0.5 bg-amber-50/40 dark:bg-amber-950/30 group-hover:scale-105 transition-transform"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-300/60 group-hover:scale-105 transition-transform">
                                                                    <Sparkles className="w-6 h-6" />
                                                                </div>
                                                            )}
                                                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                                                                Details
                                                            </span>
                                                        </div>

                                                        {/* Right: Rainbow Title Box & Description */}
                                                        <div className="space-y-2 flex-1 min-w-0">
                                                            {/* Rainbow Header Box */}
                                                            <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-100/70 via-sky-100/70 to-pink-100/70 dark:from-emerald-950/40 dark:via-sky-950/40 dark:to-pink-950/40 border border-slate-200/60 dark:border-slate-700/40">
                                                                {uSkill.name_jp && (
                                                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                        {uSkill.name_jp}
                                                                    </div>
                                                                )}
                                                                <div className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                                                    {uSkill.name}
                                                                </div>
                                                            </div>

                                                            {/* Description */}
                                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                                {uSkill.description || uSkill.desc_jp || 'Tidak ada deskripsi efek.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            {/* Innate Skills (Skill Bawaan Awal) */}
                            {innateSkills.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Zap className="w-4 h-4 text-emerald-500" />
                                            <span>Innate Skills (Skill Bawaan Awal)</span>
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {innateSkills.length} Skill Aktif
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {innateSkills.map((sk) => (
                                            <div
                                                key={sk.id}
                                                onClick={() => setSelectedSkillModal(sk)}
                                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors group shadow-2xs"
                                                title="Klik untuk melihat detail skill lengkap"
                                            >
                                                {sk.icon_url ? (
                                                    <img src={sk.icon_url} alt={sk.name} className="w-10 h-10 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                        <Zap className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div className="space-y-0.5 flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={sk.name}>
                                                            {sk.name}
                                                        </h5>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                                                            Lv. 1
                                                        </span>
                                                    </div>
                                                    {sk.name_jp && (
                                                        <div className="text-[10px] text-slate-400 font-mono truncate">{sk.name_jp}</div>
                                                    )}
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2" title={sk.description}>
                                                        {sk.description || sk.desc_jp}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Awakening Skills (Lv 2 s.d. Lv 5) */}
                            {awakeningSkills.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Award className="w-4 h-4 text-amber-500" />
                                            <span>Awakening Skills (Tingkat Awakening Lv. 2 - 5)</span>
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            Gold Skills di Lv. 3 & Lv. 5
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {awakeningSkills.map((sk) => {
                                            const isGold = sk.rarity === 2 || sk.level === 3 || sk.level === 5;
                                            return (
                                                <div
                                                    key={sk.id}
                                                    onClick={() => setSelectedSkillModal(sk)}
                                                    className={`p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 group shadow-2xs ${
                                                        isGold
                                                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/60'
                                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
                                                    }`}
                                                    title="Klik untuk melihat detail skill lengkap"
                                                >
                                                    {sk.icon_url ? (
                                                        <img src={sk.icon_url} alt={sk.name} className="w-11 h-11 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                            <Zap className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="space-y-1 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                                                                isGold
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300'
                                                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                                                            }`}>
                                                                Awakening Lv. {sk.level} {isGold ? '★ Gold' : ''}
                                                            </span>
                                                            <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                                                {sk.name}
                                                            </h5>
                                                            {sk.name_jp && (
                                                                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                                                                    ({sk.name_jp})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                                                            {sk.description || sk.desc_jp}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Evolved Skills (Fitur Khusus Server Jepang) */}
                            {evolveSkills.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            <span>Evolved Skills (Evolusi Khusus Server Jepang)</span>
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black border border-purple-300">
                                            JP Evolution
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {evolveSkills.map((sk) => (
                                            <div
                                                key={sk.id}
                                                onClick={() => setSelectedSkillModal(sk)}
                                                className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-300/80 dark:border-purple-800/60 flex items-start gap-3.5 cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors group shadow-2xs"
                                                title="Klik untuk melihat detail skill lengkap"
                                            >
                                                {sk.icon_url ? (
                                                    <img src={sk.icon_url} alt={sk.name} className="w-12 h-12 rounded-xl shrink-0 border border-purple-300/80 shadow-xs" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                                                        <Sparkles className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className="space-y-1.5 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-600 text-white shadow-xs">
                                                            Evolved
                                                        </span>
                                                        <h5 className="text-sm font-black text-slate-900 dark:text-white">
                                                            {sk.name}
                                                        </h5>
                                                        {sk.name_jp && (
                                                            <span className="text-xs font-mono text-slate-400">
                                                                ({sk.name_jp})
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Replaced base skill info */}
                                                    {sk.base_skill_name && (
                                                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <span>Menggantikan skill:</span>
                                                            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                                                                {sk.base_skill_name}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                        {sk.description || sk.desc_jp}
                                                    </p>

                                                    {/* Evolution Upgrade Requirements from GameTora JP */}
                                                    {((sk.evolution_conditions && sk.evolution_conditions.length > 0) || (sk.conditions && sk.conditions.length > 0)) && (
                                                        <div className="mt-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-800/40 space-y-1.5">
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                                <span>Persyaratan Evolusi (Syarat Upgrade):</span>
                                                            </div>
                                                            <div className="space-y-1 pl-1">
                                                                {(sk.evolution_conditions || sk.conditions).map((condGroup, cIdx) => (
                                                                    <div key={cIdx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-snug">
                                                                        <span className="w-4 h-4 rounded-full bg-purple-200/80 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                                                            {cIdx + 1}
                                                                        </span>
                                                                        <div className="flex-1">
                                                                            {Array.isArray(condGroup) ? (
                                                                                condGroup.map((condText, oIdx) => (
                                                                                    <span key={oIdx}>
                                                                                        {oIdx > 0 && (
                                                                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mx-1.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                                                                                                or
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="font-medium">{condText}</span>
                                                                                    </span>
                                                                                ))
                                                                            ) : (
                                                                                <span className="font-medium">{String(condGroup)}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 2: BASE STATS & STAT BONUSES (GAMETORA)              */}
                    {/* ======================================================== */}
                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            {/* Base Stats Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Base stats (Status Dasar)</span>
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-mono">GameTora JP</span>
                                </div>

                                {/* Card 1: Base Rarity Row */}
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                                    <div className="bg-teal-50/80 dark:bg-slate-800/90 py-1.5 px-4 text-center border-b border-teal-100 dark:border-slate-800">
                                        <span className="text-xs font-black text-amber-500 tracking-wider">
                                            {'★'.repeat(baseStars)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-5 p-3 sm:p-4 text-center divide-x divide-slate-100 dark:divide-slate-800/80">
                                        {STAT_ITEMS.map((stat, idx) => (
                                            <div key={stat.key} className="flex flex-col items-center gap-1.5 px-1">
                                                <img
                                                    src={stat.icon}
                                                    alt={stat.label}
                                                    onError={(e) => { e.currentTarget.src = stat.fallback; }}
                                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain drop-shadow-2xs"
                                                />
                                                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
                                                    {baseStats ? (baseStats[idx] ?? '-') : '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Card 2: 5-Star Row */}
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                                    <div className="bg-teal-50/80 dark:bg-slate-800/90 py-1.5 px-4 text-center border-b border-teal-100 dark:border-slate-800">
                                        <span className="text-xs font-black text-amber-500 tracking-wider">
                                            ★★★★★
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-5 p-3 sm:p-4 text-center divide-x divide-slate-100 dark:divide-slate-800/80">
                                        {STAT_ITEMS.map((stat, idx) => (
                                            <div key={stat.key} className="flex flex-col items-center gap-1.5 px-1">
                                                <img
                                                    src={stat.icon}
                                                    alt={stat.label}
                                                    onError={(e) => { e.currentTarget.src = stat.fallback; }}
                                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain drop-shadow-2xs"
                                                />
                                                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
                                                    {fiveStarStats ? (fiveStarStats[idx] ?? '-') : '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Stat Bonuses Section */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4 text-sky-500" />
                                    <span>Stat bonuses (Bonus Pertumbuhan Latihan)</span>
                                </h4>
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs p-3 sm:p-4">
                                    <div className="grid grid-cols-5 text-center divide-x divide-slate-100 dark:divide-slate-800/80">
                                        {STAT_ITEMS.map((stat, idx) => {
                                            const bonusVal = statBonus ? statBonus[idx] : 0;
                                            return (
                                                <div key={stat.key} className="flex flex-col items-center gap-1.5 px-1">
                                                    <img
                                                        src={stat.icon}
                                                        alt={stat.label}
                                                        onError={(e) => { e.currentTarget.src = stat.fallback; }}
                                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain drop-shadow-2xs"
                                                    />
                                                    <span className={`text-xs sm:text-sm font-black font-mono ${bonusVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                        {bonusVal > 0 ? `${bonusVal}%` : '-'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 3: APTITUDE (GRADE KESESUAIAN)                       */}
                    {/* ======================================================== */}
                    {activeTab === 'aptitude' && (
                        <div className="space-y-6">
                            {/* Track Section */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span>Trek Balapan (Surface Aptitude)</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {trackList.map((t) => {
                                        const badge = getGradeBadge(t.grade);
                                        return (
                                            <div key={t.key} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.label}</span>
                                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border ${badge.badge}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Distance Section */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span>Jarak Balapan (Distance Aptitude)</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {distanceList.map((d) => {
                                        const badge = getGradeBadge(d.grade);
                                        return (
                                            <div key={d.key} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-between gap-2 text-center">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.label}</span>
                                                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base border shadow-xs ${badge.badge}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Strategy Section */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span>Gaya Lari / Taktik (Running Style Aptitude)</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {styleList.map((s) => {
                                        const badge = getGradeBadge(s.grade);
                                        return (
                                            <div key={s.key} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-between gap-2 text-center">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.label}</span>
                                                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base border shadow-xs ${badge.badge}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend Information */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Panduan Grade Aptitude:</span>
                                </div>
                                <p className="leading-relaxed text-[11px]">
                                    Grade <strong>A</strong> dan <strong>S</strong> memberikan performa kecepatan dan akselerasi optimal tanpa penalti statistik. Grade <strong>B</strong> dan <strong>C</strong> memiliki sedikit penalti, sedangkan grade <strong>D s.d. G</strong> terkena penalti performa drastis dan sangat disarankan ditingkatkan melalui faktor warisan (inheritance/factor).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 4: OBJECTIVES (TARGET KARIR)                         */}
                    {/* ======================================================== */}
                    {activeTab === 'objectives' && (
                        <div className="space-y-4">
                            <div className="text-center pb-1">
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Target Karir (Objectives)</h3>
                            </div>

                            {(!objectives || objectives.length === 0) ? (
                                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-sm">
                                    Belum ada data target karir (objectives) untuk karakter ini.
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-slate-200/60 dark:divide-slate-800">
                                    {objectives.map((obj, idx) => {
                                        const isOdd = idx % 2 === 0;
                                        const bannerSrc = obj.banner_url || (obj.race_icon_id ? `https://media.gametora.com/umamusume/races/banners/${obj.race_icon_id}.png` : null);

                                        return (
                                            <div
                                                key={idx}
                                                className={`p-4 sm:p-5 flex items-center gap-4 sm:gap-6 transition-colors ${
                                                    isOdd
                                                        ? 'bg-[#e8f4f8] dark:bg-cyan-950/25'
                                                        : 'bg-white dark:bg-slate-900'
                                                }`}
                                            >
                                                {/* Left: Race banner or Ribbon Badge */}
                                                <div className="shrink-0 w-24 sm:w-28 flex items-center justify-center">
                                                    {bannerSrc ? (
                                                        <img
                                                            src={bannerSrc}
                                                            alt={obj.race_name || obj.title}
                                                            className="w-full h-auto max-h-12 object-contain rounded drop-shadow-2xs"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                if (e.currentTarget.nextElementSibling) {
                                                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className={`items-center justify-center ${bannerSrc ? 'hidden' : 'flex'}`}
                                                    >
                                                        {obj.grade ? (
                                                            <div
                                                                className="px-3.5 py-1 bg-blue-600 text-white font-black text-xs rounded-l tracking-wider flex items-center justify-center relative shadow-xs"
                                                                style={{
                                                                    clipPath: 'polygon(0% 0%, 100% 0%, 82% 50%, 100% 100%, 0% 100%)',
                                                                    paddingRight: '1.25rem'
                                                                }}
                                                            >
                                                                {obj.grade}
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800">
                                                                <Flag className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Objective Info */}
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-[15px] leading-snug">
                                                        {obj.order ? `${obj.order}. ` : ''}{translateObjectiveTitle(obj.title || obj.short_title || '')}
                                                    </h4>
                                                    {obj.turn_text && (
                                                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                            {translateTurnText(obj.turn_text)}
                                                        </div>
                                                    )}
                                                    {(obj.period || obj.class_period) && (
                                                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                            {translateClassPeriod(obj.period || obj.class_period)}
                                                        </div>
                                                    )}
                                                    {obj.track_condition && (
                                                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                            {translateTrackCondition(obj.track_condition)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with close button */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        Data bersumber resmi dari basis data GameTora JP
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-black transition-colors cursor-pointer"
                    >
                        Tutup Detail
                    </button>
                </div>
            </div>

            {/* Skill Detail Modal */}
            {selectedSkillModal && (
                <SkillDetailModal
                    skill={selectedSkillModal}
                    onClose={() => setSelectedSkillModal(null)}
                />
            )}
        </div>
    );
}
