import React, { useState } from 'react';
import { 
    X, 
    Sparkles, 
    Zap, 
    ChevronDown, 
    ChevronUp, 
    Info, 
    CheckCircle2, 
    Compass, 
    Flag, 
    Trophy, 
    Clock, 
    Gauge, 
    ArrowUpRight, 
    Shield, 
    Heart, 
    Eye, 
    MapPin, 
    Shuffle, 
    Code, 
    BookOpen,
    HelpCircle,
    UserCheck,
    TrendingUp
} from 'lucide-react';
import { translateConditionString, translateClause } from '../utils/skillConditionTranslator';

/**
 * Format conditions or preconditions with order_rate annotations and linebreaks
 * e.g. order_rate<=40 -> order_rate<=40 (CM <= 4 | LoH <= 5)
 */
function formatConditionString(cond) {
    if (!cond || typeof cond !== 'string') return '';

    // Add CM & LoH position annotations for order_rate
    let formatted = cond.replace(/order_rate\s*(<=|>=|<|>|==)\s*(\d+)/g, (match, op, valStr) => {
        const val = parseInt(valStr, 10);
        const cm = Math.ceil((9 * val) / 100);
        const loh = Math.ceil((12 * val) / 100);
        return `${match} (CM [Champions Meetings] ${op} ${cm} | LoH [League of Heroes] ${op} ${loh})`;
    });

    // Put each '&' and '@' on a new line matching GameTora
    formatted = formatted.replace(/\s*(&|@)\s*/g, '\n$1');
    return formatted.trim();
}

/**
 * Render category icon for condition items
 */
function ConditionCategoryIcon({ category, icon, className = "w-3.5 h-3.5" }) {
    switch (category) {
        case 'phase':
            return <Flag className={`${className} text-emerald-500`} />;
        case 'track':
            return <Compass className={`${className} text-sky-500`} />;
        case 'position':
            return <Trophy className={`${className} text-amber-500`} />;
        case 'progress':
            return <Gauge className={`${className} text-indigo-500`} />;
        case 'action':
            return <ArrowUpRight className={`${className} text-pink-500`} />;
        case 'status':
            return <Shield className={`${className} text-cyan-500`} />;
        case 'strategy':
            return <UserCheck className={`${className} text-purple-500`} />;
        case 'skill':
            return <Sparkles className={`${className} text-amber-500`} />;
        case 'random':
            return <Shuffle className={`${className} text-violet-500`} />;
        default:
            return <Zap className={`${className} text-purple-500`} />;
    }
}

export default function SkillDetailModal({ skill, onClose }) {
    if (!skill) return null;

    const [openScalings, setOpenScalings] = useState(() => ({ '0-0': true }));
    const [openRawFormulas, setOpenRawFormulas] = useState({});

    const toggleScaling = (key) => {
        setOpenScalings(prev => ({
            ...prev,
            [key]: prev[key] === undefined ? false : !prev[key],
        }));
    };

    const toggleRawFormula = (key) => {
        setOpenRawFormulas(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Resolve fields with fallbacks
    const iconUrl = skill.icon_url || (skill.icon_id ? `https://gametora.com/images/umamusume/skill_icons/utx_ico_skill_${skill.icon_id}.png` : null);
    const nameEn = skill.name || skill.name_en || 'Skill Detail';
    const nameJp = skill.name_jp || skill.jpname;
    const descJp = skill.desc_jp || skill.jpdesc;
    const descEn = skill.desc_en || skill.description || skill.endesc;

    const rarityLabel = skill.rarity_label || (
        skill.rarity === 6 ? 'Evolved' :
        skill.rarity === 4 ? 'Upgraded unique' :
        skill.rarity === 5 || skill.rarity === 3 ? 'Unique' :
        skill.rarity === 2 ? 'Rare' : 'Normal'
    );

    const activationLabel = skill.activation_label || (
        skill.activation === 0 ? 'Guaranteed' :
        skill.activation === 1 ? 'Wit check' :
        (skill.activation !== undefined && skill.activation !== null ? `Type ${skill.activation}` : 'Wit check')
    );

    const baseCost = skill.base_cost ?? skill.cost ?? null;
    const baseDuration = skill.base_duration || (skill.base_time !== undefined ? (skill.base_time === 0 ? 'Instant effect' : skill.base_time === -1 ? 'none' : `${skill.base_time / 10000} s`) : null);

    // Resolve effects list fallback
    const fallbackEffects = skill.effects && skill.effects.length > 0
        ? skill.effects
        : (skill.condition_groups && skill.condition_groups[0]?.effects ? skill.condition_groups[0].effects : []);

    // Resolve condition groups (triggers)
    const conditionGroups = (skill.condition_groups && skill.condition_groups.length > 0)
        ? skill.condition_groups
        : [{
            condition: skill.conditions || skill.condition || null,
            precondition: skill.precondition || null,
            base_duration: baseDuration,
            effects: fallbackEffects,
        }];

    const hasMultipleTriggers = conditionGroups.length > 1;

    return (
        <div 
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        {iconUrl ? (
                            <img 
                                src={iconUrl} 
                                alt={nameEn} 
                                className="w-12 h-12 rounded-xl shrink-0 border border-purple-300 dark:border-purple-700/80 shadow-xs" 
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                                <Zap className="w-6 h-6" />
                            </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center flex-wrap gap-2">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    {nameEn}
                                </h3>
                                {skill.level && (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 text-xs font-black shrink-0">
                                        Lv +{skill.level}
                                    </span>
                                )}
                                {skill.version_label && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-black shrink-0">
                                        {skill.version_label}
                                    </span>
                                )}
                            </div>
                            {nameJp && (
                                <div className="text-xs font-mono text-slate-400 dark:text-slate-400">
                                    {nameJp}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Tutup (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content Body */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                    {/* Japanese & English Descriptions */}
                    <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        {descJp && (
                            <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Deskripsi JP: </span>
                                <span className="text-slate-600 dark:text-slate-300">{descJp}</span>
                            </div>
                        )}
                        {descEn && (
                            <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Deskripsi EN: </span>
                                <span className="text-slate-800 dark:text-slate-200 font-medium">{descEn}</span>
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid (Rarity, Activation, Base Cost) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rarity</div>
                            <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                    rarityLabel === 'Evolved' ? 'bg-pink-500' :
                                    rarityLabel === 'Unique' || rarityLabel === 'Upgraded unique' ? 'bg-amber-500' :
                                    rarityLabel === 'Rare' ? 'bg-purple-500' : 'bg-slate-400'
                                }`} />
                                <span>{rarityLabel}</span>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktivasi</div>
                            <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                                {activationLabel}
                            </div>
                        </div>

                        {baseCost !== null && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biaya Skill (Base)</div>
                                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                                    {baseCost} pt
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Evolution Details (if evolved skill) */}
                    {skill.base_skill_name && (
                        <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 space-y-2">
                            <div className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                                Berevolusi Dari (Evolved From)
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white">
                                {skill.base_skill_name}
                                {skill.base_skill_name_jp && (
                                    <span className="text-xs text-slate-400 font-mono ml-2">({skill.base_skill_name_jp})</span>
                                )}
                            </div>
                            {skill.evolution_conditions && skill.evolution_conditions.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Syarat Evolusi:</div>
                                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                                        {skill.evolution_conditions.map((grp, gIdx) => (
                                            <li key={gIdx}>
                                                {Array.isArray(grp) ? grp.join(' ATAU ') : String(grp)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trigger / Condition Groups Section */}
                    <div className="space-y-4">
                        {conditionGroups.map((cg, cgIdx) => {
                            const cgEffects = (cg.effects && cg.effects.length > 0) ? cg.effects : fallbackEffects;
                            const triggerDuration = cg.base_duration || baseDuration;
                            const rawFormulaKey = `raw-${cgIdx}`;
                            const isRawOpen = openRawFormulas[rawFormulaKey] || false;

                            // Parse and translate conditions
                            const parsedCondition = translateConditionString(cg.condition);
                            const parsedPrecondition = cg.precondition ? translateConditionString(cg.precondition) : null;

                            return (
                                <div 
                                    key={cgIdx} 
                                    className={`space-y-3.5 p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                                        hasMultipleTriggers 
                                            ? 'bg-slate-100/70 dark:bg-slate-800/90 border-purple-200/80 dark:border-purple-900/70 shadow-xs' 
                                            : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/70'
                                    }`}
                                >
                                    {/* Trigger Header */}
                                    {hasMultipleTriggers && (
                                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-700/80">
                                            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            <h4 className="text-xs sm:text-sm font-black italic text-slate-900 dark:text-purple-300">
                                                Trigger {cgIdx + 1}
                                            </h4>
                                        </div>
                                    )}

                                    {/* Precondition (if present) */}
                                    {cg.precondition && (
                                        <div className="space-y-2 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60">
                                            <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                <span>Syarat Awal (Precondition):</span>
                                            </div>

                                            {/* Human Readable Precondition */}
                                            {parsedPrecondition && (
                                                <div className="text-xs text-purple-950 dark:text-purple-100 font-semibold space-y-1.5">
                                                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-900/60 shadow-2xs leading-relaxed">
                                                        {parsedPrecondition.summary}
                                                    </div>
                                                    {parsedPrecondition.branches?.[0]?.conditions?.length > 1 && (
                                                        <div className="space-y-1.5 pl-1">
                                                            {parsedPrecondition.branches[0].conditions.map((item, iIdx) => (
                                                                <div key={iIdx} className="space-y-0.5">
                                                                    <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                                                                        <ConditionCategoryIcon category={item.category} icon={item.icon} />
                                                                        <span>{item.text}</span>
                                                                        <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-1 rounded">
                                                                            {item.raw}
                                                                        </span>
                                                                    </div>
                                                                    {item.note && (
                                                                        <p className="text-[10.5px] text-purple-800/80 dark:text-purple-300/80 pl-5 font-normal">
                                                                            {item.note}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Conditions Section (Human Readable by default + Formula Toggle) */}
                                    {cg.condition && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                    <span>Kondisi Aktivasi (Syarat Balapan):</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRawFormula(rawFormulaKey)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-700/70 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                    title="Lihat formula teknis asli GameTora"
                                                >
                                                    <Code className="w-3 h-3" />
                                                    <span>{isRawOpen ? 'Tutup Formula' : 'Formula Teknis'}</span>
                                                </button>
                                            </div>

                                            {/* Human Readable Box */}
                                            <div className="p-3 sm:p-3.5 rounded-xl bg-sky-50/70 dark:bg-slate-900/90 border border-sky-200/90 dark:border-sky-900/60 shadow-xs space-y-3">
                                                {/* Summary Sentence Box */}
                                                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700/80 shadow-2xs">
                                                    <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                                                        {parsedCondition.summary}
                                                    </div>
                                                </div>

                                                {/* Detailed Condition Clauses List */}
                                                <div className="space-y-2.5 pt-0.5">
                                                    {parsedCondition.branches.map((branch, bIdx) => (
                                                        <div key={bIdx} className="space-y-1.5">
                                                            {/* Alternative OR Divider */}
                                                            {bIdx > 0 && (
                                                                <div className="py-2 flex items-center gap-2">
                                                                    <div className="h-px bg-amber-300 dark:bg-amber-700 flex-1"></div>
                                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                                        ⚡ ATAU (Alternatif Kondisi {bIdx + 1})
                                                                    </span>
                                                                    <div className="h-px bg-amber-300 dark:bg-amber-700 flex-1"></div>
                                                                </div>
                                                            )}

                                                            <div className="grid gap-1.5">
                                                                {branch.conditions.map((item, cIdx) => (
                                                                    <div 
                                                                        key={cIdx} 
                                                                        className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                                    >
                                                                        <div className="flex items-start gap-2 min-w-0">
                                                                            <div className="mt-0.5 shrink-0">
                                                                                <ConditionCategoryIcon category={item.category} icon={item.icon} />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                                                                    {item.text}
                                                                                </span>
                                                                                {item.note && (
                                                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-normal">
                                                                                        {item.note}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/90 px-1.5 py-0.5 rounded shrink-0 border border-slate-200/80 dark:border-slate-700">
                                                                            {item.raw}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Tournament Context Note when order_rate is involved */}
                                                {Boolean(cg.condition && cg.condition.includes('order_rate')) && (
                                                    <div className="mt-2 pt-2 border-t border-sky-200/70 dark:border-slate-700/60 flex items-center gap-2 text-[10.5px] text-sky-800 dark:text-sky-300 font-medium">
                                                        <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                                        <span>
                                                            <strong>Keterangan Turnamen:</strong> <strong>CM</strong> = <em>Champions Meetings</em> (9 peserta) | <strong>LoH</strong> = <em>League of Heroes</em> (12 peserta).
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Collapsible Raw Mathematical Code Box */}
                                            {isRawOpen && (
                                                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] border border-slate-800 space-y-1.5 animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800 uppercase font-bold tracking-wider">
                                                        <span>Formula Teknis GameTora:</span>
                                                        <span>Raw Formula</span>
                                                    </div>
                                                    <div className="text-purple-300 font-semibold break-all whitespace-pre-line leading-relaxed select-all">
                                                        {formatConditionString(cg.condition)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Base Duration */}
                                    {triggerDuration && (
                                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 pt-0.5">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">Durasi Dasar (Base duration):</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60">
                                                {triggerDuration}
                                            </span>
                                        </div>
                                    )}

                                    {/* Effects for this Trigger */}
                                    {cgEffects.length > 0 && (
                                        <div className="space-y-2 pt-1">
                                            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                                <span>{cgEffects.length > 1 ? 'Daftar Efek (Effects):' : 'Efek Skill:'}</span>
                                            </div>

                                            {cgEffects.map((eff, effIdx) => {
                                                const scalingKey = `${cgIdx}-${effIdx}`;
                                                const isScalingOpen = openScalings[scalingKey] !== false;
                                                const effScaling = eff.special_scaling || null;

                                                return (
                                                    <div key={effIdx} className="space-y-2">
                                                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs">
                                                            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                                <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1.5">
                                                                    {cgEffects.length > 1 ? `Efek ${effIdx + 1}:` : 'Efek:'}
                                                                </span>
                                                                <span>{eff.display_text || `${eff.name || 'Effect'} (${eff.formatted_value || eff.value})`}</span>
                                                            </div>
                                                            {effScaling && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleScaling(scalingKey)}
                                                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                                                >
                                                                    <span>Special scaling</span>
                                                                    {isScalingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Special Scaling Box */}
                                                        {effScaling && isScalingOpen && (
                                                            <div className="p-4 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 space-y-3 animate-in fade-in duration-150">
                                                                <div className="space-y-1">
                                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                                        {effScaling.base_text || `Nilai dasar untuk efek ini adalah ${effScaling.base_value}.`}
                                                                    </div>
                                                                    <div className="text-xs text-slate-700 dark:text-slate-300">
                                                                        {effScaling.text}
                                                                    </div>
                                                                </div>

                                                                {/* Scaling Table */}
                                                                {effScaling.rows && effScaling.rows.length > 0 && (
                                                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-2xs">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead>
                                                                                <tr className="bg-slate-200/80 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                                                                                    <th className="px-3.5 py-2">{effScaling.header || 'Kondisi'}</th>
                                                                                    <th className="px-3 py-2 text-center">Mult</th>
                                                                                    <th className="px-3.5 py-2 text-right">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60 font-mono text-[11px]">
                                                                                {effScaling.rows.map((r, rIdx) => (
                                                                                    <tr 
                                                                                        key={rIdx} 
                                                                                        className={rIdx % 2 === 0 ? 'bg-cyan-100/50 dark:bg-cyan-900/20' : 'bg-white dark:bg-slate-900/60'}
                                                                                    >
                                                                                        <td className="px-3.5 py-2 font-semibold text-slate-800 dark:text-slate-200">
                                                                                            {r.condition}
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-center text-slate-700 dark:text-slate-300">
                                                                                            {r.mult}
                                                                                        </td>
                                                                                        <td className="px-3.5 py-2 text-right font-bold text-slate-900 dark:text-cyan-300">
                                                                                            {r.total}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer shadow-xs"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
