import React, { useState, useEffect } from 'react';
import SkillDetailModal from './SkillDetailModal';
import {
    X,
    Sparkles,
    Zap,
    BookOpen,
    Layers,
    Award,
    ExternalLink,
    ChevronRight,
    HelpCircle,
    Info,
    CheckCircle2,
    Heart,
    Smile,
    ShieldCheck,
    Loader2
} from 'lucide-react';

/**
 * Mapping type color themes
 */
function getTypeTheme(type) {
    const t = (type || '').toLowerCase();
    switch (t) {
        case 'speed':
            return {
                badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300',
                header: 'from-sky-500/20 via-sky-500/5 to-transparent',
                accent: 'text-sky-500',
                border: 'border-sky-400',
                dot: 'bg-sky-500',
            };
        case 'stamina':
            return {
                badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300',
                header: 'from-rose-500/20 via-rose-500/5 to-transparent',
                accent: 'text-rose-500',
                border: 'border-rose-400',
                dot: 'bg-rose-500',
            };
        case 'power':
            return {
                badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300',
                header: 'from-amber-500/20 via-amber-500/5 to-transparent',
                accent: 'text-amber-500',
                border: 'border-amber-400',
                dot: 'bg-amber-500',
            };
        case 'guts':
            return {
                badge: 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300 border-pink-300',
                header: 'from-pink-500/20 via-pink-500/5 to-transparent',
                accent: 'text-pink-500',
                border: 'border-pink-400',
                dot: 'bg-pink-500',
            };
        case 'wit':
        case 'intelligence':
            return {
                badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300',
                header: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
                accent: 'text-emerald-500',
                border: 'border-emerald-400',
                dot: 'bg-emerald-500',
            };
        case 'friend':
            return {
                badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/70 dark:text-yellow-300 border-yellow-300',
                header: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
                accent: 'text-yellow-500',
                border: 'border-yellow-400',
                dot: 'bg-yellow-500',
            };
        case 'group':
            return {
                badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300',
                header: 'from-purple-500/20 via-purple-500/5 to-transparent',
                accent: 'text-purple-500',
                border: 'border-purple-400',
                dot: 'bg-purple-500',
            };
        default:
            return {
                badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
                header: 'from-slate-500/20 via-slate-500/5 to-transparent',
                accent: 'text-slate-500',
                border: 'border-slate-400',
                dot: 'bg-slate-500',
            };
    }
}

/**
 * Format reward badges
 */
function RewardBadge({ reward, onSkillClick }) {
    const { type, value, skill } = reward;

    switch (type) {
        case 'sp':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>Speed {value}</span>
                </span>
            );
        case 'st':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Stamina {value}</span>
                </span>
            );
        case 'po':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Power {value}</span>
                </span>
            );
        case 'gu':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    <span>Guts {value}</span>
                </span>
            );
        case 'in':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Wit {value}</span>
                </span>
            );
        case 'en':
            return (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                    value?.startsWith('-')
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                }`}>
                    <Heart className="w-3 h-3 text-rose-500" />
                    <span>Energy {value}</span>
                </span>
            );
        case 'mo':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Smile className="w-3 h-3 text-amber-500" />
                    <span>Mood {value}</span>
                </span>
            );
        case 'bo':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                    <span>Bond {value}</span>
                </span>
            );
        case 'pt':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Skill Pt {value}</span>
                </span>
            );
        case 'he':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                    <ShieldCheck className="w-3 h-3 text-teal-500" />
                    <span>Cure Condition</span>
                </span>
            );
        case 'sk':
            return (
                <button
                    type="button"
                    onClick={() => onSkillClick?.(reward)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-700 shadow-xs cursor-pointer transition-all active:scale-95 group"
                    title={`Klik untuk melihat detail efek skill ${skill?.name || ''}`}
                >
                    {skill?.icon_url ? (
                        <img src={skill.icon_url} alt={skill.name} className="w-4 h-4 rounded-xs shrink-0" />
                    ) : (
                        <Zap className="w-3 h-3 text-purple-500 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2">
                        {skill ? skill.name : 'Skill Hint'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 text-[10px] font-black">
                        Lv {value}
                    </span>
                </button>
            );
        case 'di':
            return null;
        default:
            return value ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {value}
                </span>
            ) : null;
    }
}

export default function SupportCardDetailModal({ card, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('effects'); // 'effects' | 'hints' | 'events'
    const [selectedLevelCol, setSelectedLevelCol] = useState(null); // '0lb' | '1lb' | '2lb' | '3lb' | 'mlb'
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [cardDetails, setCardDetails] = useState(card?.details || null);
    const [selectedSkillPopup, setSelectedSkillPopup] = useState(null);

    // Escape listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (selectedSkillPopup) {
                    setSelectedSkillPopup(null);
                } else {
                    onClose?.();
                }
            }
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, selectedSkillPopup]);

    // Synchronize card details and fetch events if needed
    useEffect(() => {
        if (!isOpen || !card) return;

        // Initialize details from card
        const existingDetails = card.details || null;
        setCardDetails(existingDetails);
        setSelectedSkillPopup(null);

        // Auto select current owned LB level column
        const limitBreak = card.limit_break || 0;
        const colMap = ['0lb', '1lb', '2lb', '3lb', 'mlb'];
        setSelectedLevelCol(colMap[limitBreak] || 'mlb');

        const cardTypeLower = (card.card_type || '').toLowerCase();
        const isFg = cardTypeLower === 'friend' || cardTypeLower === 'group' || Boolean(existingDetails?.is_friend_or_group);
        const needsFetch = isFg
            ? (!existingDetails?.dates || existingDetails.dates.length === 0)
            : (!existingDetails?.training_events || existingDetails.training_events.length === 0);

        // Check if training events / dates need fetching
        if (needsFetch && (card.gametora_id || card.uma_catalog_item_id || card.id)) {
            setLoadingEvents(true);
            const queryId = card.uma_catalog_item_id || card.gametora_id || card.id;
            fetch(`/api/collection/support-cards/detail?id=${encodeURIComponent(queryId)}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && data.card?.details) {
                        setCardDetails(data.card.details);
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch support card detail:', err);
                })
                .finally(() => {
                    setLoadingEvents(false);
                });
        }
    }, [isOpen, card]);

    if (!isOpen || !card) return null;

    const theme = getTypeTheme(card.card_type);
    const rarity = card.rarity || 'SSR';
    const limitBreak = card.limit_break || 0;
    const isOwned = Boolean(card.is_owned);

    const isFriendOrGroup = (card.card_type || '').toLowerCase() === 'friend' 
        || (card.card_type || '').toLowerCase() === 'group' 
        || Boolean(cardDetails?.is_friend_or_group);

    const levelHeaders = cardDetails?.level_headers || (rarity === 'SSR' ? [30, 35, 40, 45, 50] : (rarity === 'SR' ? [25, 30, 35, 40, 45] : [20, 25, 30, 35, 40]));
    const effectsTable = cardDetails?.effects_table || [];
    const uniqueEffect = cardDetails?.unique_effect || null;
    const hintSkills = cardDetails?.hints?.skills || [];
    const hintOthers = cardDetails?.hints?.others || [];
    const eventSkills = cardDetails?.event_skills || [];
    const trainingEvents = cardDetails?.training_events || [];
    const datesEvents = cardDetails?.dates || [];
    const displayEvents = isFriendOrGroup ? (datesEvents.length > 0 ? datesEvents : trainingEvents) : trainingEvents;

    const handleSkillClick = async (reward) => {
        const rawSkill = reward.skill || {};
        const rawId = rawSkill.id ? Number(rawSkill.id) : null;
        const rawName = (rawSkill.name || '').toLowerCase();
        const rawNameJp = rawSkill.name_jp || '';

        const foundSkill = cardDetails?.event_skills?.find(s => 
            (rawId && Number(s.id) === rawId) || 
            (rawName && s.name && s.name.toLowerCase() === rawName) ||
            (rawNameJp && s.name_jp && s.name_jp === rawNameJp)
        ) || cardDetails?.hints?.skills?.find(s => 
            (rawId && Number(s.id) === rawId) || 
            (rawName && s.name && s.name.toLowerCase() === rawName) ||
            (rawNameJp && s.name_jp && s.name_jp === rawNameJp)
        );

        const mergedSkill = {
            ...(foundSkill || {}),
            ...(rawSkill || {}),
            id: rawSkill.id || foundSkill?.id,
            name: rawSkill.name || foundSkill?.name || 'Skill Hint',
            name_jp: rawSkill.name_jp || foundSkill?.name_jp,
            description: rawSkill.description || foundSkill?.description || foundSkill?.desc_jp || 'Efek skill dapat diperoleh saat event ini dipicu dalam mode Ikusei.',
            desc_jp: rawSkill.desc_jp || foundSkill?.desc_jp,
            icon_url: rawSkill.icon_url || foundSkill?.icon_url,
            condition_groups: foundSkill?.condition_groups || rawSkill.condition_groups || null,
            condition: foundSkill?.condition || rawSkill.condition || null,
            conditions: foundSkill?.conditions || rawSkill.conditions || null,
            condition_translated: foundSkill?.condition_translated || rawSkill.condition_translated || null,
            precondition: foundSkill?.precondition || rawSkill.precondition || null,
            precondition_translated: foundSkill?.precondition_translated || rawSkill.precondition_translated || null,
            effects: foundSkill?.effects || rawSkill.effects || null,
            base_duration: foundSkill?.base_duration || rawSkill.base_duration || null,
            rarity: foundSkill?.rarity ?? rawSkill.rarity ?? null,
            rarity_label: foundSkill?.rarity_label || rawSkill.rarity_label || null,
            activation: foundSkill?.activation ?? rawSkill.activation ?? null,
            activation_label: foundSkill?.activation_label || rawSkill.activation_label || null,
            base_cost: foundSkill?.base_cost ?? rawSkill.base_cost ?? null,
            level: reward.value || rawSkill.level || foundSkill?.level || null,
        };

        setSelectedSkillPopup(mergedSkill);

        // If condition data is missing, asynchronously fetch complete skill data from API
        const needsEnrichment = (!mergedSkill.condition_groups || mergedSkill.condition_groups.length === 0) 
            && !mergedSkill.condition 
            && !mergedSkill.conditions;

        const targetId = mergedSkill.id || rawSkill.id;
        const targetName = mergedSkill.name || rawSkill.name;

        if (needsEnrichment && (targetId || targetName)) {
            try {
                const param = targetId ? `id=${encodeURIComponent(targetId)}` : `name=${encodeURIComponent(targetName)}`;
                const res = await fetch(`/api/collection/skill-detail?${param}`);
                const data = await res.json();
                if (data.success && data.skill) {
                    setSelectedSkillPopup(prev => {
                        if (!prev) return null;
                        return {
                            ...data.skill,
                            ...prev,
                            condition_groups: data.skill.condition_groups || prev.condition_groups,
                            condition: data.skill.condition || prev.condition,
                            conditions: data.skill.conditions || prev.conditions,
                            condition_translated: data.skill.condition_translated || prev.condition_translated,
                            precondition: data.skill.precondition || prev.precondition,
                            precondition_translated: data.skill.precondition_translated || prev.precondition_translated,
                            effects: data.skill.effects || prev.effects,
                            base_duration: data.skill.base_duration || prev.base_duration,
                            base_cost: data.skill.base_cost ?? prev.base_cost,
                            rarity: data.skill.rarity ?? prev.rarity,
                            rarity_label: data.skill.rarity_label || prev.rarity_label,
                            activation: data.skill.activation ?? prev.activation,
                            activation_label: data.skill.activation_label || prev.activation_label,
                            level: prev.level || data.skill.level || null,
                        };
                    });
                }
            } catch (err) {
                console.error('Gagal mengambil detail terjemahan kondisi skill:', err);
            }
        }
    };

    const colKeys = [
        { key: '0lb', label: '0LB', level: levelHeaders[0] },
        { key: '1lb', label: '1LB', level: levelHeaders[1] },
        { key: '2lb', label: '2LB', level: levelHeaders[2] },
        { key: '3lb', label: '3LB', level: levelHeaders[3] },
        { key: 'mlb', label: 'MLB', level: levelHeaders[4] },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* ======================================================== */}
                {/* HEADER                                                   */}
                {/* ======================================================== */}
                <div className={`p-4 sm:p-6 bg-gradient-to-r ${theme.header} border-b border-slate-200/80 dark:border-slate-800 shrink-0`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                            {/* Card Artwork / Thumbnail */}
                            <div className="w-14 h-18 sm:w-16 sm:h-22 rounded-2xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-800 relative">
                                {card.image_url || card.icon_url ? (
                                    <img 
                                        src={card.image_url || card.icon_url} 
                                        alt={card.name} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Layers className="w-6 h-6 text-slate-400" />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Rarity Badge */}
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-wider ${
                                        rarity === 'SSR'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : rarity === 'SR'
                                                ? 'bg-purple-600 text-white shadow-xs'
                                                : 'bg-slate-600 text-white'
                                    }`}>
                                        {rarity}
                                    </span>

                                    {/* Type Badge */}
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${theme.badge}`}>
                                        {card.card_type}
                                    </span>

                                    {/* Limit Break Badge */}
                                    {isOwned && (
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                            limitBreak === 4
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
                                        }`}>
                                            {limitBreak === 4 ? '⭐ MLB (4LB)' : `${limitBreak}LB Dimiliki`}
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                                    {card.name}
                                </h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Karakter: <strong className="text-slate-800 dark:text-slate-200">{card.char_name || '-'}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                            title="Tutup (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setActiveTab('effects')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                activeTab === 'effects'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Stats & Efek (0LB - MLB)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('hints')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                activeTab === 'hints'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Hints ({hintSkills.length}) & Event Skills ({eventSkills.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('events')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                activeTab === 'events'
                                    ? (isFriendOrGroup ? 'bg-rose-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs')
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {isFriendOrGroup ? (
                                <>
                                    <Heart className="w-3.5 h-3.5" />
                                    <span>Dates {displayEvents.length > 0 ? `(${displayEvents.length})` : ''}</span>
                                </>
                            ) : (
                                <>
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Training Events {displayEvents.length > 0 ? `(${displayEvents.length})` : ''}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* BODY CONTENT                                             */}
                {/* ======================================================== */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                    {/* ==================================================== */}
                    {/* TAB 1: EFFECTS TABLE (0LB TO MLB)                    */}
                    {/* ==================================================== */}
                    {activeTab === 'effects' && (
                        <div className="space-y-6">
                            {/* Unique Effect Banner */}
                            {uniqueEffect && (
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            <span>Efek Unik (Unique Effect)</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-white shadow-xs">
                                            Aktif di Lv. {uniqueEffect.level || 30}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {uniqueEffect.effects?.map((ue, idx) => (
                                            <span 
                                                key={idx}
                                                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-amber-200 dark:border-amber-900/60 shadow-2xs"
                                            >
                                                {ue.name_en || ue.name_ja}: <strong>+{ue.value || 0}%</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Limit Break Level Highlights Filter */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-emerald-500" />
                                    <span>Sorot Tingkatan Limit Break:</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {colKeys.map((c) => (
                                        <button
                                            key={c.key}
                                            type="button"
                                            onClick={() => setSelectedLevelCol(c.key)}
                                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                                selectedLevelCol === c.key
                                                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <span>{c.label}</span>
                                            <span className="text-[9px] opacity-80 ml-1">Lv.{c.level}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Interactive Effects Table */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                                                <th className="px-4 py-3 min-w-[180px]">Efek Support</th>
                                                {colKeys.map((c) => (
                                                    <th 
                                                        key={c.key} 
                                                        className={`px-3 py-3 text-center transition-colors ${
                                                            selectedLevelCol === c.key
                                                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black'
                                                                : ''
                                                        }`}
                                                    >
                                                        <div>{c.label}</div>
                                                        <div className="text-[10px] font-normal opacity-75">Lv.{c.level}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {effectsTable.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                                        Data efek kartu belum tersedia.
                                                    </td>
                                                </tr>
                                            ) : (
                                                effectsTable.map((eff) => {
                                                    const symbol = eff.symbol === 'percent' ? '%' : '';

                                                    return (
                                                        <tr 
                                                            key={eff.id}
                                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-slate-900 dark:text-white">
                                                                    {eff.name_en === 'Effect 32' || eff.id === 32 ? 'Initial Skill Points Up' : (eff.name_en || `Effect ${eff.id}`)}
                                                                </div>
                                                                {eff.name_ja && (
                                                                    <div className="text-[10px] font-mono text-slate-400">
                                                                        {eff.name_ja}
                                                                    </div>
                                                                )}
                                                                {eff.desc_en && (
                                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1" title={eff.desc_en}>
                                                                        {eff.desc_en}
                                                                    </p>
                                                                )}
                                                            </td>

                                                            {colKeys.map((c) => {
                                                                const val = eff.levels?.[c.key] ?? 0;
                                                                const isHighlight = selectedLevelCol === c.key;

                                                                return (
                                                                    <td 
                                                                        key={c.key}
                                                                        className={`px-3 py-3 text-center font-mono font-bold transition-colors ${
                                                                            isHighlight 
                                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm'
                                                                                : val > 0 
                                                                                    ? 'text-slate-800 dark:text-slate-200' 
                                                                                    : 'text-slate-300 dark:text-slate-600'
                                                                        }`}
                                                                    >
                                                                        {val !== 0 ? `${val}${symbol}` : '-'}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================================================== */}
                    {/* TAB 2: SUPPORT HINTS & EVENT SKILLS                  */}
                    {/* ==================================================== */}
                    {activeTab === 'hints' && (
                        <div className="space-y-6">
                            {/* General Hint Bonuses */}
                            {hintOthers.length > 0 && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <Info className="w-4 h-4 text-emerald-500" />
                                        <span>Bonus Petunjuk Karakter (Hint Bonuses):</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {hintOthers.map((ho, idx) => (
                                            <span 
                                                key={idx}
                                                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                            >
                                                {ho.label}: <strong>+{ho.value}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Support Hints Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                        <Sparkles className="w-4 h-4 text-emerald-500" />
                                        <span>Support Hints (Petunjuk Skill Training)</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-400">
                                        {hintSkills.length} Skill
                                    </span>
                                </div>

                                {hintSkills.length === 0 ? (
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center text-xs text-slate-400">
                                        Tidak ada skill petunjuk pada kartu ini.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {hintSkills.map((sk) => (
                                            <div 
                                                key={sk.id}
                                                onClick={() => handleSkillClick({ skill: sk, value: 1 })}
                                                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-start gap-3 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors group"
                                                title="Klik untuk melihat detail skill"
                                            >
                                                {sk.icon_url ? (
                                                    <img src={sk.icon_url} alt={sk.name} className="w-10 h-10 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                        <Zap className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {sk.name}
                                                    </h4>
                                                    {sk.name_jp && (
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            {sk.name_jp}
                                                        </div>
                                                    )}
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-medium line-clamp-2" title={sk.description}>
                                                        {sk.description || sk.desc_jp || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Skills from Events Section */}
                            <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                        <Award className="w-4 h-4 text-purple-500" />
                                        <span>Skills from Events (Skill dari Ikusei Event)</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-400">
                                        {eventSkills.length} Skill
                                    </span>
                                </div>

                                {eventSkills.length === 0 ? (
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center text-xs text-slate-400">
                                        Tidak ada skill khusus dari event untuk kartu ini.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {eventSkills.map((sk) => (
                                            <div 
                                                key={sk.id}
                                                onClick={() => handleSkillClick({ skill: sk, value: 1 })}
                                                className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-200 dark:border-purple-800/80 shadow-xs flex items-start gap-3 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-colors group"
                                                title="Klik untuk melihat detail skill"
                                            >
                                                {sk.icon_url ? (
                                                    <img src={sk.icon_url} alt={sk.name} className="w-10 h-10 rounded-xl shrink-0 border border-purple-300/80 shadow-2xs group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                        <Award className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                        {sk.name}
                                                    </h4>
                                                    {sk.name_jp && (
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            {sk.name_jp}
                                                        </div>
                                                    )}
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-medium line-clamp-2" title={sk.description}>
                                                        {sk.description || sk.desc_jp || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ==================================================== */}
                    {/* TAB 3: TRAINING EVENTS / DATES                       */}
                    {/* ==================================================== */}
                    {activeTab === 'events' && (
                        <div className="space-y-4">
                            {loadingEvents ? (
                                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
                                    <Loader2 className={`w-8 h-8 animate-spin ${isFriendOrGroup ? 'text-rose-500' : 'text-emerald-500'}`} />
                                    <p className="text-xs font-medium">
                                        {isFriendOrGroup 
                                            ? 'Mengambil data Dates (Kencan) dari GameTora...' 
                                            : 'Mengambil data Training Events dari GameTora...'}
                                    </p>
                                </div>
                            ) : displayEvents.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center space-y-2">
                                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {isFriendOrGroup ? 'Data Dates Belum Tersedia' : 'Data Training Events Belum Tersedia'}
                                    </h4>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        {isFriendOrGroup
                                            ? 'Informasi kencan bertingkat (sequential outing) untuk kartu ini belum disinkronkan dari server GameTora.'
                                            : 'Informasi event berkelanjutan untuk kartu ini belum disinkronkan dari server GameTora atau kartu ini tidak memiliki event chain.'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {displayEvents.map((ev, eIdx) => (
                                        <div 
                                            key={ev.id || eIdx}
                                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5"
                                        >
                                            {/* Event Step & Title */}
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    {isFriendOrGroup ? (
                                                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black font-mono text-xs flex items-center justify-center border border-rose-300 dark:border-rose-800 shadow-2xs">
                                                            {ev.step_symbol || `(>${'>'.repeat(eIdx)})`}
                                                        </span>
                                                    ) : (
                                                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                                                            {ev.step || (eIdx + 1)}
                                                        </span>
                                                    )}
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                                            {ev.name}
                                                        </h4>
                                                        {ev.name_ja && (
                                                            <div className="text-[10px] font-mono text-slate-400">
                                                                {ev.name_ja}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                                    isFriendOrGroup 
                                                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}>
                                                    {isFriendOrGroup ? `Outing Stage ${eIdx + 1}` : `Chain Event ${eIdx + 1}`}
                                                </span>
                                            </div>

                                            {/* Choices & Rewards */}
                                            <div className="space-y-2.5">
                                                {ev.choices?.map((ch, cIdx) => {
                                                    const hasRandom = ch.has_random_outcome || ch.reward_groups?.length > 1 || ch.rewards?.some(r => r.type === 'di');
                                                    let groups = [];
                                                    if (ch.reward_groups && ch.reward_groups.length > 1) {
                                                        groups = ch.reward_groups;
                                                    } else if (ch.rewards?.some(r => r.type === 'di')) {
                                                        let curr = [];
                                                        for (const r of ch.rewards) {
                                                            if (r.type === 'di') {
                                                                if (curr.length > 0) groups.push(curr);
                                                                curr = [];
                                                            } else {
                                                                curr.push(r);
                                                            }
                                                        }
                                                        if (curr.length > 0) groups.push(curr);
                                                    } else {
                                                        groups = [ch.rewards || []];
                                                    }

                                                    return (
                                                        <div 
                                                            key={cIdx}
                                                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
                                                        >
                                                            {/* Choice Option Name */}
                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center">
                                                                    {cIdx + 1}
                                                                </span>
                                                                <span>
                                                                    {ch.option_ja || ch.option_en || (isFriendOrGroup ? 'Lanjut Kencan (Direct Date Event)' : 'Pilihan Tunggal (Direct Event)')}
                                                                </span>
                                                            </div>

                                                            {/* Choice Rewards List (with Randomly Either separation if random) */}
                                                            {hasRandom && groups.length > 1 ? (
                                                                <div className="space-y-2 pl-6 pt-1">
                                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                                                        <span>Randomly either</span>
                                                                    </div>

                                                                    {groups.map((grp, gIdx) => (
                                                                        <React.Fragment key={gIdx}>
                                                                            {gIdx > 0 && (
                                                                                <div className="flex items-center gap-2 py-0.5">
                                                                                    <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1" />
                                                                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                                                                                        or
                                                                                    </span>
                                                                                    <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1" />
                                                                                </div>
                                                                            )}
                                                                            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                                                                                {grp.map((r, rIdx) => (
                                                                                    <RewardBadge 
                                                                                        key={rIdx} 
                                                                                        reward={r} 
                                                                                        onSkillClick={handleSkillClick} 
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-wrap items-center gap-1.5 pl-6">
                                                                    {ch.rewards?.filter(r => r.type !== 'di').map((r, rIdx) => (
                                                                        <RewardBadge 
                                                                            key={rIdx} 
                                                                            reward={r} 
                                                                            onSkillClick={handleSkillClick} 
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ======================================================== */}
                {/* FOOTER                                                   */}
                {/* ======================================================== */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Data disinkronkan resmi dari database GameTora Jepang
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>

            </div>

            {/* ======================================================== */}
            {/* SKILL DETAIL POPUP MODAL                                 */}
            {/* ======================================================== */}
            {selectedSkillPopup && (
                <SkillDetailModal 
                    skill={selectedSkillPopup} 
                    onClose={() => setSelectedSkillPopup(null)} 
                />
            )}
        </div>
    );
}
