import React, { useState, useMemo, useEffect } from 'react';
import { 
    X, 
    Zap, 
    Search, 
    ShieldAlert, 
    AlertTriangle, 
    Sparkles, 
    ChevronRight, 
    SlidersHorizontal, 
    Info, 
    BookOpen, 
    Flame,
    CheckCircle2
} from 'lucide-react';
import noDebuffData from '../data/noDebuffSkills.json';
import SkillDetailModal from './SkillDetailModal';

export default function NoDebuffSkillsModal({ onClose }) {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'gold' | 'white' | 'inherited'
    const [showJapaneseRule, setShowJapaneseRule] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState(null);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !selectedSkill) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, selectedSkill]);

    const skills = noDebuffData.skills || [];

    const goldCount = useMemo(() => skills.filter(s => s.rarity_type === 'gold').length, [skills]);
    const whiteCount = useMemo(() => skills.filter(s => s.rarity_type === 'white').length, [skills]);
    const inheritedCount = useMemo(() => skills.filter(s => s.is_inherited).length, [skills]);

    // Filtered list
    const filteredSkills = useMemo(() => {
        const q = search.trim().toLowerCase();
        return skills.filter((skill) => {
            if (filterType === 'gold' && skill.rarity_type !== 'gold') return false;
            if (filterType === 'white' && skill.rarity_type !== 'white') return false;
            if (filterType === 'inherited' && !skill.is_inherited) return false;

            if (q) {
                const matchJp = skill.name_jp?.toLowerCase().includes(q);
                const matchEn = skill.name_en?.toLowerCase().includes(q);
                const matchTarget = skill.target_query?.toLowerCase().includes(q);
                const matchDesc = skill.desc_en?.toLowerCase().includes(q) || skill.desc_jp?.includes(q);
                if (!matchJp && !matchEn && !matchTarget && !matchDesc) return false;
            }

            return true;
        });
    }, [skills, search, filterType]);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white flex items-start justify-between gap-4 shrink-0 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-xs uppercase tracking-wider flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>Aturan Khusus Resmi Cygames</span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black/25">
                                {noDebuffData.target_event}
                            </span>
                        </div>
                        <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                            <span>Aturan Khusus: No Debuff (デバフなし)</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-rose-100/90 mt-1">
                            Daftar 55 skill yang dinonaktifkan (tidak akan terpicu) pada Champions Meeting MILE Akhir Maret 2027
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white shrink-0"
                        title="Tutup Modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader / Official Translated Rule Banner */}
                <div className="p-4 sm:p-5 bg-rose-50/80 dark:bg-rose-950/30 border-b border-rose-200/80 dark:border-rose-900/60 shrink-0 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 mt-0.5 shadow-xs">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5 flex-1 text-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-black text-rose-950 dark:text-rose-200 text-sm">
                                    Pemberitahuan Resmi Cygames JP
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowJapaneseRule(!showJapaneseRule)}
                                    className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <BookOpen className="w-3 h-3" />
                                    <span>{showJapaneseRule ? 'Sembunyikan Teks Asli JP' : 'Lihat Teks Asli Jepang (原文)'}</span>
                                </button>
                            </div>

                            {/* Indonesian Translation */}
                            <p className="text-rose-900/90 dark:text-rose-200/90 leading-relaxed font-medium">
                                Pada <strong>&ldquo;Aturan Khusus: No Debuff (Tanpa Debuff)&rdquo;</strong>, seluruh 55 skill di bawah ini <strong>TIDAK AKAN AKTIF / TERPICU</strong> selama balapan berlangsung.
                            </p>
                            <p className="text-rose-800 dark:text-rose-300 leading-relaxed text-[11px] bg-rose-100/70 dark:bg-rose-900/40 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-800/60">
                                <span className="font-black text-rose-900 dark:text-rose-100">※ Pengecualian Resmi: </span>
                                Skill Unik (<em>Unique Skills</em>) dan Skill Evolusi (<em>Evolved Skills</em>) bawaan karakter <strong>dikecualikan dari larangan ini</strong>, sehingga tetap akan aktif meskipun memiliki efek debuff yang mengurangi kecepatan atau membuat lelah (menguras stamina) Uma Musume lawan. (<em>Hanya versi Warisan / Inherited dari Skill Unik debuff yang dinonaktifkan</em>).
                            </p>

                            {/* Original Japanese text toggled */}
                            {showJapaneseRule && (
                                <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono leading-relaxed border border-slate-700 animate-fadeIn">
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">PENGUMUMAN RESMI CYGAMES (JEPANG):</div>
                                    <p className="text-amber-300 font-bold">「特殊ルール：デバフなし」では、以下のスキルが発動しません。</p>
                                    <p className="text-slate-300 mt-1">※固有スキルおよび進化スキルは対象外となり、他のウマ娘の速度を下げたり、疲れやすくさせたりするデバフ効果を含んでいても発動します。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari nama skill (JP / EN)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterType === 'all'
                                    ? 'bg-rose-600 text-white font-black shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                        >
                            <span>Semua</span>
                            <span className="text-[10px] opacity-75 ml-1">({skills.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('gold')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                filterType === 'gold'
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                        >
                            <span>Gold / Langka</span>
                            <span className="text-[10px] opacity-75">({goldCount})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('white')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                filterType === 'white'
                                    ? 'bg-slate-700 text-white font-black shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                        >
                            <span>Normal / Putih</span>
                            <span className="text-[10px] opacity-75">({whiteCount})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('inherited')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                filterType === 'inherited'
                                    ? 'bg-purple-600 text-white font-black shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                            }`}
                        >
                            <span>Warisan / 継承</span>
                            <span className="text-[10px] opacity-75">({inheritedCount})</span>
                        </button>
                    </div>
                </div>

                {/* Body: Skills List */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
                    {filteredSkills.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            Tidak ada skill debuff yang sesuai dengan pencarian &ldquo;{search}&rdquo;.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredSkills.map((skill, idx) => {
                                const isGold = skill.rarity_type === 'gold';
                                const isInherited = skill.is_inherited;

                                return (
                                    <div
                                        key={skill.id || idx}
                                        onClick={() => setSelectedSkill(skill)}
                                        className={`p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-2.5 cursor-pointer hover:shadow-md ${
                                            isGold
                                                ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400'
                                                : isInherited
                                                    ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/90 dark:border-purple-800/60 hover:border-purple-400'
                                                    : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-700'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Skill Icon */}
                                            <div className="relative w-10 h-10 shrink-0">
                                                <img
                                                    src={skill.icon_url}
                                                    alt={skill.name_jp}
                                                    className="w-10 h-10 rounded-xl object-contain border border-slate-200/60 dark:border-slate-700/60 shadow-2xs bg-slate-900/5 dark:bg-slate-900/50"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const next = e.currentTarget.nextElementSibling;
                                                        if (next) next.style.display = 'flex';
                                                    }}
                                                />
                                                <div
                                                    className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-black shrink-0"
                                                    style={{ display: 'none' }}
                                                >
                                                    <Zap className="w-5 h-5 text-rose-500" />
                                                </div>
                                            </div>

                                            {/* Name & Rarity */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={skill.name_jp}>
                                                        {skill.name_jp}
                                                    </h4>
                                                    {isGold && (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-2xs">
                                                            Gold
                                                        </span>
                                                    )}
                                                    {isInherited && (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-600 text-white shadow-2xs">
                                                            Warisan
                                                        </span>
                                                    )}
                                                    {!isGold && !isInherited && (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                            Normal
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5" title={skill.name_en}>
                                                    {skill.name_en}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Snippet */}
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                            {skill.desc_en || skill.desc_jp}
                                        </p>

                                        {/* Footer Action */}
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-0.5">
                                            <span className="italic">GameTora ID: {skill.id}</span>
                                            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5 hover:underline">
                                                <span>Rincian Formula</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
                    <span className="font-semibold">
                        Menampilkan {filteredSkills.length} dari {skills.length} skill debuff nonaktif
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold transition-all cursor-pointer shadow-xs"
                    >
                        Tutup
                    </button>
                </div>
            </div>

            {/* Nested Skill Detail Modal for formulas and conditions */}
            {selectedSkill && (
                <SkillDetailModal
                    skill={selectedSkill}
                    onClose={() => setSelectedSkill(null)}
                />
            )}
        </div>
    );
}
