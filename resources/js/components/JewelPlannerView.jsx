import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, 
    Calculator, 
    Calendar, 
    Ticket, 
    Coins, 
    ShieldCheck, 
    AlertCircle, 
    TrendingUp, 
    CheckCircle2, 
    Save, 
    RefreshCw, 
    ChevronDown, 
    ChevronUp, 
    Info, 
    Gift,
    Trophy,
    Award,
    Flame,
    Zap,
    Crown,
    Target,
    ArrowRight,
    ShoppingBag
} from 'lucide-react';

const STADIUM_RATES = {
    6: 250,
    5: 200,
    4: 150,
    3: 100,
    2: 70,
    1: 50,
    0: 0,
};

const CIRCLE_RANK_RATES = {
    'SS': 3000,
    'S+': 2400,
    'S': 2100,
    'A+': 1800,
    'A': 1500,
    'B+': 1200,
    'B': 900,
    'C+': 600,
    'C': 300,
    'D+': 150,
    'Unranked': 0,
};

const CM_OPTIONS = {
    // Champions Meeting (Grade League)
    'final_a_1': { label: 'Final Group A - Juara 1 (3.000 Carat + 10 Tiket)', carats: 3000, tickets: 10, charTickets: 5, suppTickets: 5, group: 'Champions Meeting (Grade League)' },
    'final_a_2': { label: 'Final Group A - Juara 2 (2.400 Carat + 8 Tiket)', carats: 2400, tickets: 8, charTickets: 4, suppTickets: 4, group: 'Champions Meeting (Grade League)' },
    'final_a_3': { label: 'Final Group A - Juara 3 (1.800 Carat + 6 Tiket)', carats: 1800, tickets: 6, charTickets: 3, suppTickets: 3, group: 'Champions Meeting (Grade League)' },
    'final_b_1': { label: 'Final Group B - Juara 1 (1.800 Carat + 6 Tiket)', carats: 1800, tickets: 6, charTickets: 3, suppTickets: 3, group: 'Champions Meeting (Grade League)' },
    'final_b_2': { label: 'Final Group B - Juara 2 (1.500 Carat + 4 Tiket)', carats: 1500, tickets: 4, charTickets: 2, suppTickets: 2, group: 'Champions Meeting (Grade League)' },
    'final_b_3': { label: 'Final Group B - Juara 3 (1.200 Carat + 2 Tiket)', carats: 1200, tickets: 2, charTickets: 1, suppTickets: 1, group: 'Champions Meeting (Grade League)' },

    // League of Heroes (Cumulative Tiers)
    'loh_platinum_4': { label: 'LoH - Platinum 4 (3.290 Carat + 4 Tiket)', carats: 3290, tickets: 4, charTickets: 2, suppTickets: 2, group: 'League of Heroes (Cumulative Tier)' },
    'loh_platinum_3': { label: 'LoH - Platinum 3 (2.790 Carat + 4 Tiket)', carats: 2790, tickets: 4, charTickets: 2, suppTickets: 2, group: 'League of Heroes (Cumulative Tier)' },
    'loh_platinum_2': { label: 'LoH - Platinum 2 (2.290 Carat + 4 Tiket)', carats: 2290, tickets: 4, charTickets: 2, suppTickets: 2, group: 'League of Heroes (Cumulative Tier)' },
    'loh_platinum_1': { label: 'LoH - Platinum 1 (1.790 Carat + 4 Tiket)', carats: 1790, tickets: 4, charTickets: 2, suppTickets: 2, group: 'League of Heroes (Cumulative Tier)' },
    'loh_platinum': { label: 'LoH - Platinum 1 (1.790 Carat + 4 Tiket)', carats: 1790, tickets: 4, charTickets: 2, suppTickets: 2, group: 'League of Heroes (Cumulative Tier)' },
    'loh_gold_4': { label: 'LoH - Gold 4 (1.290 Carat + 4 Tiket)', carats: 1290, tickets: 4, charTickets: 2, suppTickets: 2, group: 'League of Heroes (Cumulative Tier)' },
    'loh_gold_3': { label: 'LoH - Gold 3 (990 Carat + 3 Tiket)', carats: 990, tickets: 3, charTickets: 2, suppTickets: 1, group: 'League of Heroes (Cumulative Tier)' },
    'loh_gold_2': { label: 'LoH - Gold 2 (690 Carat + 2 Tiket)', carats: 690, tickets: 2, charTickets: 1, suppTickets: 1, group: 'League of Heroes (Cumulative Tier)' },
    'loh_gold_1': { label: 'LoH - Gold 1 (540 Carat + 1 Tiket)', carats: 540, tickets: 1, charTickets: 1, suppTickets: 0, group: 'League of Heroes (Cumulative Tier)' },
    'loh_silver_4': { label: 'LoH - Silver 4 (390 Carat)', carats: 390, tickets: 0, charTickets: 0, suppTickets: 0, group: 'League of Heroes (Cumulative Tier)' },
    'loh_silver_3': { label: 'LoH - Silver 3 (290 Carat)', carats: 290, tickets: 0, charTickets: 0, suppTickets: 0, group: 'League of Heroes (Cumulative Tier)' },
    'loh_silver_2': { label: 'LoH - Silver 2 (190 Carat)', carats: 190, tickets: 0, charTickets: 0, suppTickets: 0, group: 'League of Heroes (Cumulative Tier)' },
    'loh_silver_1': { label: 'LoH - Silver 1 (140 Carat)', carats: 140, tickets: 0, charTickets: 0, suppTickets: 0, group: 'League of Heroes (Cumulative Tier)' },

    // None
    'none': { label: 'Tidak Mengikuti / Skip Hadiah (0 Carat)', carats: 0, tickets: 0, charTickets: 0, suppTickets: 0, group: 'Lainnya' },
};

export default function JewelPlannerView({ onNotify }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedAccordion, setExpandedAccordion] = useState({
        f2p: true,
        shop: true,
        competitive: true,
        pve: true,
        passes: true,
    });

    const [config, setConfig] = useState({
        free_carats: 15000,
        paid_carats: 0,
        character_tickets: 5,
        support_tickets: 5,
        target_banner_type: 'character', // 'character' | 'support' | 'all'
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        spark_goal_multiplier: 1.0,
        include_predictions: true,
        f2p_daily_missions: true,
        f2p_login_bonus: true,
        f2p_training_pass: true,
        stadium_class: 6,
        circle_rank: 'A',
        champions_meeting_target: 'final_a_2',
        shop_friendship_enabled: true,
        shop_horseshoe_silver: true,
        shop_horseshoe_gold: true,
        shop_horseshoe_rainbow: false,
        story_events_count: 1,
        legend_races_count: 1,
        g1_bonus_enabled: false,
        pakalive_streams_count: 1,
        daily_jewel_pack: false,
        trainer_pass: false,
    });

    // Fetch initial config from backend
    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/planner/config');
            if (res.ok) {
                const data = await res.json();
                if (data.config) {
                    setConfig(prev => ({
                        ...prev,
                        ...data.config,
                        character_tickets: data.config.character_tickets ?? data.config.single_tickets ?? 5,
                        support_tickets: data.config.support_tickets ?? 5,
                        target_banner_type: data.config.target_banner_type ?? 'character',
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to load planner config:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    // Save config to backend
    const handleSaveConfig = async () => {
        try {
            setSaving(true);
            const res = await fetch('/api/planner/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                onNotify?.('Konfigurasi Jewel Planner berhasil disimpan ke database!', 'success');
            } else {
                onNotify?.(data.message || 'Gagal menyimpan konfigurasi.', 'error');
            }
        } catch (err) {
            console.error('Save config failed:', err);
            onNotify?.('Gagal menghubungi server untuk menyimpan.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Calculate days and periods
    const calculation = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(config.target_date);
        target.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const diffWeeks = Math.floor(diffDays / 7);

        // Count 1st of month occurrences for Circle payouts & Shop Resets
        let circlePayoutCount = 0;
        const curDate = new Date(today);
        while (curDate <= target) {
            if (curDate.getDate() === 1 && curDate > today) {
                circlePayoutCount++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }
        if (circlePayoutCount === 0 && diffDays >= 20) {
            circlePayoutCount = 1;
        }

        const monthsCount = Math.max(1, Math.round(diffDays / 30));
        const shopResetCount = Math.max(1, circlePayoutCount > 0 ? circlePayoutCount : monthsCount);

        // 1. Current Holdings
        const freeCarats = parseInt(config.free_carats, 10) || 0;
        const paidCarats = parseInt(config.paid_carats, 10) || 0;
        const characterTickets = parseInt(config.character_tickets, 10) || 0;
        const supportTickets = parseInt(config.support_tickets, 10) || 0;
        const targetBannerType = config.target_banner_type || 'character';

        const currentCarats = freeCarats + paidCarats;
        const currentCaratsPulls = Math.floor(currentCarats / 150);
        const currentCaratsRemainder = currentCarats % 150;

        // Current tickets applicable according to target banner type
        let currentTicketsPulls = 0;
        if (targetBannerType === 'character') {
            currentTicketsPulls = characterTickets;
        } else if (targetBannerType === 'support') {
            currentTicketsPulls = supportTickets;
        } else {
            currentTicketsPulls = characterTickets + supportTickets;
        }
        const currentTotalPulls = currentCaratsPulls + currentTicketsPulls;

        // 2. Projected Incomes
        // F2P Dailies & Routine
        const dailyMissions = config.f2p_daily_missions ? diffDays * 30 : 0;
        const loginBonus = config.f2p_login_bonus ? Math.floor(diffDays * (110 / 8)) : 0;
        const stadiumRate = STADIUM_RATES[config.stadium_class] ?? 250;
        const stadiumCarats = stadiumRate * diffWeeks;
        const f2pPassCarats = config.f2p_training_pass !== false ? monthsCount * 500 : 0;
        const totalF2pCarats = dailyMissions + loginBonus + stadiumCarats + f2pPassCarats;

        // Shop Exchanges (Friendship Shop & Cleat/Horseshoe Shop)
        // 1. Friendship Point Shop: 1 Tiket Karakter + 1 Tiket Support Card per bulan (@ 20.000 FP)
        const shopFriendshipCharTickets = config.shop_friendship_enabled !== false ? shopResetCount * 1 : 0;
        const shopFriendshipSuppTickets = config.shop_friendship_enabled !== false ? shopResetCount * 1 : 0;

        // 2. Horseshoe / Cleat Shop:
        // Silver Horseshoe: 2 Char + 2 Support / bulan
        const shopSilverCharTickets = config.shop_horseshoe_silver !== false ? shopResetCount * 2 : 0;
        const shopSilverSuppTickets = config.shop_horseshoe_silver !== false ? shopResetCount * 2 : 0;
        // Gold Horseshoe: 2 Char + 2 Support / bulan
        const shopGoldCharTickets = config.shop_horseshoe_gold !== false ? shopResetCount * 2 : 0;
        const shopGoldSuppTickets = config.shop_horseshoe_gold !== false ? shopResetCount * 2 : 0;
        // Rainbow Horseshoe (Opsional, butuh buang SSR): 2 Char + 2 Support / bulan
        const shopRainbowCharTickets = config.shop_horseshoe_rainbow === true ? shopResetCount * 2 : 0;
        const shopRainbowSuppTickets = config.shop_horseshoe_rainbow === true ? shopResetCount * 2 : 0;

        const totalCleatCharTickets = shopSilverCharTickets + shopGoldCharTickets + shopRainbowCharTickets;
        const totalCleatSuppTickets = shopSilverSuppTickets + shopGoldSuppTickets + shopRainbowSuppTickets;

        const totalShopCharTickets = shopFriendshipCharTickets + totalCleatCharTickets;
        const totalShopSuppTickets = shopFriendshipSuppTickets + totalCleatSuppTickets;

        // Competitive (Circle & CM/LoH)
        const circleRate = CIRCLE_RANK_RATES[config.circle_rank] ?? 1500;
        const circleCarats = circleRate * Math.max(1, circlePayoutCount);
        const cmData = CM_OPTIONS[config.champions_meeting_target] || CM_OPTIONS['final_a_2'];
        const cmCarats = cmData.carats * monthsCount;
        const cmTickets = cmData.tickets * monthsCount;
        const cmCharTickets = (cmData.charTickets ?? Math.floor(cmData.tickets / 2)) * monthsCount;
        const cmSuppTickets = (cmData.suppTickets ?? Math.ceil(cmData.tickets / 2)) * monthsCount;
        const totalCompetitiveCarats = circleCarats + cmCarats;

        // PvE Events (Kalibrasi Realistis JP Server)
        const storyCarats = (parseInt(config.story_events_count, 10) || 0) * 1000;
        const legendCarats = (parseInt(config.legend_races_count, 10) || 0) * 150;
        const g1Carats = config.g1_bonus_enabled ? monthsCount * 300 : 0;
        const pakaliveCarats = (parseInt(config.pakalive_streams_count, 10) || 0) * 1500;
        const totalPveCarats = storyCarats + legendCarats + g1Carats + pakaliveCarats;

        // Paid Passes
        const dailyPackPaid = config.daily_jewel_pack ? Math.max(1, Math.ceil(diffDays / 30)) * 500 : 0;
        const dailyPackFree = config.daily_jewel_pack ? diffDays * 50 : 0;
        const dailyPackCarats = dailyPackPaid + dailyPackFree;
        const trainerPassCarats = config.trainer_pass ? monthsCount * 1700 : 0;
        const trainerPassPaid = config.trainer_pass ? monthsCount * 350 : 0;
        const trainerPassFree = config.trainer_pass ? monthsCount * 1350 : 0;
        const trainerPassCharTickets = config.trainer_pass ? monthsCount * 2 : 0;
        const trainerPassSuppTickets = config.trainer_pass ? monthsCount * 2 : 0;
        const trainerPassTickets = trainerPassCharTickets + trainerPassSuppTickets;
        const totalPassesCarats = dailyPackCarats + trainerPassCarats;

        // Grand Totals & Projections
        const grandProjectedCarats = totalF2pCarats + totalCompetitiveCarats + totalPveCarats + totalPassesCarats;
        const grandTotalCarats = currentCarats + grandProjectedCarats;

        // Projected Tickets based on target banner
        let grandProjectedTickets = 0;
        let totalActiveTickets = 0;
        if (targetBannerType === 'character') {
            grandProjectedTickets = totalShopCharTickets + trainerPassCharTickets + cmCharTickets;
            totalActiveTickets = characterTickets + grandProjectedTickets;
        } else if (targetBannerType === 'support') {
            grandProjectedTickets = totalShopSuppTickets + trainerPassSuppTickets + cmSuppTickets;
            totalActiveTickets = supportTickets + grandProjectedTickets;
        } else {
            grandProjectedTickets = totalShopCharTickets + totalShopSuppTickets + trainerPassTickets + cmTickets;
            totalActiveTickets = characterTickets + supportTickets + grandProjectedTickets;
        }

        const grandTotalTickets = totalActiveTickets;
        const grandTotalAllTickets = characterTickets + supportTickets + totalShopCharTickets + totalShopSuppTickets + trainerPassTickets + cmTickets;

        // Pulls exclusively from predictions
        const projectedCaratsPulls = Math.floor(grandProjectedCarats / 150);
        const projectedTicketsPulls = grandProjectedTickets;
        const projectedTotalPulls = projectedCaratsPulls + projectedTicketsPulls;

        // Grand total pull capacity (with predictions)
        const totalPullCapacity = Math.floor(grandTotalCarats / 150) + grandTotalTickets;

        // Target Spark Calculation
        const sparkMultiplier = parseFloat(config.spark_goal_multiplier) || 1.0;
        const targetPulls = Math.round(200 * sparkMultiplier);
        const targetCarats = targetPulls * 150;

        // Status Tanpa Prediksi (Aset Saat Ini)
        const currentReadinessPercent = Math.min(200, Math.round((currentTotalPulls / targetPulls) * 100));
        const currentPullDeficit = Math.max(0, targetPulls - currentTotalPulls);
        const currentPullSurplus = Math.max(0, currentTotalPulls - targetPulls);
        const currentCaratDeficit = currentPullDeficit * 150;
        const isCurrentGuaranteed = currentPullDeficit === 0;

        // Status Dengan Prediksi (Proyeksi Target Tanggal)
        const projectedReadinessPercent = Math.min(200, Math.round((totalPullCapacity / targetPulls) * 100));
        const projectedPullDeficit = Math.max(0, targetPulls - totalPullCapacity);
        const projectedPullSurplus = Math.max(0, totalPullCapacity - targetPulls);
        const projectedCaratDeficit = projectedPullDeficit * 150;
        const projectedDailyCaratDeficit = diffDays > 0 ? Math.ceil(projectedCaratDeficit / diffDays) : projectedCaratDeficit;
        const isProjectedGuaranteed = projectedPullDeficit === 0;

        // Mode Evaluasi Aktif (include_predictions)
        const isPredictionsEnabled = config.include_predictions !== false;
        const activeTotalPulls = isPredictionsEnabled ? totalPullCapacity : currentTotalPulls;
        const activeTotalCarats = isPredictionsEnabled ? grandTotalCarats : currentCarats;
        const activeTotalTickets = isPredictionsEnabled ? grandTotalTickets : currentTicketsPulls;
        const readinessPercent = isPredictionsEnabled ? projectedReadinessPercent : currentReadinessPercent;
        const pullDeficit = isPredictionsEnabled ? projectedPullDeficit : currentPullDeficit;
        const pullSurplus = isPredictionsEnabled ? projectedPullSurplus : currentPullSurplus;
        const caratDeficit = isPredictionsEnabled ? projectedCaratDeficit : currentCaratDeficit;
        const dailyCaratDeficit = isPredictionsEnabled ? projectedDailyCaratDeficit : (diffDays > 0 ? Math.ceil(caratDeficit / diffDays) : caratDeficit);
        const isGuaranteed = isPredictionsEnabled ? isProjectedGuaranteed : isCurrentGuaranteed;

        return {
            diffDays,
            diffWeeks,
            monthsCount,
            shopResetCount,
            targetBannerType,
            freeCarats,
            paidCarats,
            characterTickets,
            supportTickets,
            currentCarats,
            currentCaratsPulls,
            currentCaratsRemainder,
            currentTicketsPulls,
            currentTotalPulls,
            dailyMissions,
            loginBonus,
            stadiumCarats,
            f2pPassCarats,
            totalF2pCarats,
            shopFriendshipCharTickets,
            shopFriendshipSuppTickets,
            shopSilverCharTickets,
            shopSilverSuppTickets,
            shopGoldCharTickets,
            shopGoldSuppTickets,
            shopRainbowCharTickets,
            shopRainbowSuppTickets,
            totalCleatCharTickets,
            totalCleatSuppTickets,
            totalShopCharTickets,
            totalShopSuppTickets,
            circleCarats,
            cmCarats,
            cmTickets,
            cmCharTickets,
            cmSuppTickets,
            totalCompetitiveCarats,
            storyCarats,
            legendCarats,
            g1Carats,
            pakaliveCarats,
            totalPveCarats,
            dailyPackCarats,
            dailyPackPaid,
            dailyPackFree,
            trainerPassCarats,
            trainerPassPaid,
            trainerPassFree,
            trainerPassCharTickets,
            trainerPassSuppTickets,
            trainerPassTickets,
            totalPassesCarats,
            grandProjectedCarats,
            grandProjectedTickets,
            projectedCaratsPulls,
            projectedTicketsPulls,
            projectedTotalPulls,
            grandTotalCarats,
            grandTotalTickets,
            grandTotalAllTickets,
            totalPullCapacity,
            targetPulls,
            targetCarats,
            currentReadinessPercent,
            currentPullDeficit,
            currentPullSurplus,
            currentCaratDeficit,
            isCurrentGuaranteed,
            projectedReadinessPercent,
            projectedPullDeficit,
            projectedPullSurplus,
            projectedCaratDeficit,
            projectedDailyCaratDeficit,
            isProjectedGuaranteed,
            isPredictionsEnabled,
            activeTotalPulls,
            activeTotalCarats,
            activeTotalTickets,
            readinessPercent,
            pullDeficit,
            pullSurplus,
            caratDeficit,
            dailyCaratDeficit,
            isGuaranteed,
        };
    }, [config]);

    const toggleAccordion = (key) => {
        setExpandedAccordion(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                    Memuat Kalkulator Jewel & Spark Planner Server JP...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/40">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/40 text-xs font-black text-amber-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>JP Server Edition</span>
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-xs font-mono font-bold text-indigo-200">
                                Gamewith & Kamigame Validated
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                            <Calculator className="w-7 h-7 text-amber-400" />
                            <span>Advanced Jewel & Spark Planner</span>
                        </h1>
                        <p className="text-emerald-200/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                            Kalkulator budgeting gacha khusus <strong>Server Jepang</strong>. Proyeksikan akumulasi Carat, tiket gacha, dan kepastian spark target banner impian Anda tanpa risiko salah hitung.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleSaveConfig}
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Spark Readiness & Capacity Hero Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                Ringkasan Kesiapan Spark Banner
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                                calculation.isGuaranteed
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                            }`}>
                                {calculation.isGuaranteed 
                                    ? (calculation.isPredictionsEnabled ? '✨ SPARK GUARANTEED!' : '✨ SPARK READY SEKARANG!') 
                                    : `⚠️ DEFISIT ${calculation.pullDeficit} PULL`}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Target Spark: <strong>{config.spark_goal_multiplier}x Spark ({calculation.targetPulls} Pulls / {calculation.targetCarats.toLocaleString()} Carat)</strong> hingga tanggal {config.target_date} ({calculation.diffDays} hari lagi)
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                        {/* Opsi Switch: Dengan Prediksi vs Tanpa Prediksi */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, include_predictions: true })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    calculation.isPredictionsEnabled
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Hitung total kapasitas tarikan termasuk akumulasi F2P, Circle, PvP, PvE, dan Pass hingga tanggal target"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Dengan Prediksi</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, include_predictions: false })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    !calculation.isPredictionsEnabled
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Hitung murni kapasitas tarikan yang dapat dilakukan saat ini dengan saldo Carat + Tiket yang ada di tangan"
                            >
                                <Coins className="w-3.5 h-3.5" />
                                <span>Tanpa Prediksi (Aset Saat Ini)</span>
                            </button>
                        </div>

                        <div className="text-right flex items-baseline gap-2 pl-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                {calculation.isPredictionsEnabled ? 'Kapasitas Proyeksi:' : 'Kapasitas Saat Ini:'}
                            </span>
                            <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {calculation.activeTotalPulls}
                            </span>
                            <span className="text-sm font-bold text-slate-500">/ {calculation.targetPulls} Pulls</span>
                        </div>
                    </div>
                </div>

                {/* Readiness Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Kesiapan Spark ({calculation.readinessPercent}%)</span>
                            <span className="text-[11px] font-normal text-slate-400">
                                — Mode: {calculation.isPredictionsEnabled ? 'Proyeksi Hingga Target Tanggal' : 'Hanya Aset Saat Ini'}
                            </span>
                        </span>
                        <span className={calculation.isGuaranteed ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                            {calculation.isGuaranteed 
                                ? `Surplus +${calculation.pullSurplus} Pulls (+${(calculation.pullSurplus * 150).toLocaleString()} Carat)` 
                                : `Kurang ${calculation.pullDeficit} Pulls (${calculation.caratDeficit.toLocaleString()} Carat)`}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                calculation.isGuaranteed
                                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300'
                                    : 'bg-gradient-to-r from-amber-500 to-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, calculation.readinessPercent))}%` }}
                        ></div>
                    </div>
                </div>

                {/* Breakdown Komparasi Tarikan 3-Kolom (Saat Ini vs Prediksi vs Total) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                    {/* 1. Saldo Aset Saat Ini */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                        !calculation.isPredictionsEnabled 
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/20 shadow-sm' 
                            : 'bg-white dark:bg-slate-800/90 border-slate-200/70 dark:border-slate-700/60'
                    }`}>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                                <Coins className="w-3.5 h-3.5 text-amber-500" />
                                <span>1. Tarikan Aset Saat Ini</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                                Tanpa Prediksi
                            </span>
                        </div>
                        <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                            {calculation.currentTotalPulls} <span className="text-xs font-bold text-slate-500">Pulls</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                            <div>• Dari Carat: <strong>{calculation.currentCaratsPulls}</strong> pull ({calculation.currentCarats.toLocaleString()} Carat{calculation.currentCaratsRemainder > 0 ? `, sisa ${calculation.currentCaratsRemainder}` : ''})</div>
                            <div>• Dari Tiket {calculation.targetBannerType === 'support' ? 'Support' : 'Karakter'}: <strong>{calculation.currentTicketsPulls}</strong> pull ({calculation.characterTickets} char, {calculation.supportTickets} card)</div>
                        </div>
                    </div>

                    {/* 2. Tambahan dari Prediksi Planner */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span>2. Tambahan Prediksi</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                +{calculation.diffDays} Hari
                            </span>
                        </div>
                        <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                            +{calculation.projectedTotalPulls} <span className="text-xs font-bold text-slate-500">Pulls</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                            <div>• Dari Carat: <strong>+{calculation.projectedCaratsPulls}</strong> pull (+{calculation.grandProjectedCarats.toLocaleString()} Carat)</div>
                            <div>• Dari Tiket Hadiah: <strong>+{calculation.grandProjectedTickets}</strong> pull (Toko FP, Tapal Kuda, LoH & Pass)</div>
                        </div>
                    </div>

                    {/* 3. Total Proyeksi Akhir */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                        calculation.isPredictionsEnabled 
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/20 shadow-sm' 
                            : 'bg-white dark:bg-slate-800/90 border-slate-200/70 dark:border-slate-700/60'
                    }`}>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-teal-700 dark:text-teal-300">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>3. Total Kapasitas Akhir</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                                Dengan Prediksi
                            </span>
                        </div>
                        <div className="text-2xl font-black font-mono text-teal-900 dark:text-teal-100">
                            {calculation.totalPullCapacity} <span className="text-xs font-bold text-slate-500">Pulls</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                            <div>• Total Carat: <strong>{calculation.grandTotalCarats.toLocaleString()}</strong> Carat</div>
                            <div>• Total Tiket {calculation.targetBannerType === 'support' ? 'Support' : 'Karakter'}: <strong>{calculation.grandTotalTickets}</strong> pull gacha</div>
                        </div>
                    </div>
                </div>

                {/* 4 Summary Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {/* 1. Total Carats */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{calculation.isPredictionsEnabled ? 'Total Akumulasi Carat' : 'Saldo Carat Saat Ini'}</span>
                        </span>
                        <div className="mt-2 text-2xl font-black font-mono text-emerald-900 dark:text-emerald-100">
                            {calculation.activeTotalCarats.toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/70 flex justify-between">
                            {calculation.isPredictionsEnabled ? (
                                <>
                                    <span>Saldo: {calculation.currentCarats.toLocaleString()}</span>
                                    <span>+Proyeksi: {calculation.grandProjectedCarats.toLocaleString()}</span>
                                </>
                            ) : (
                                <>
                                    <span>Free: {calculation.freeCarats.toLocaleString()}</span>
                                    <span>Paid: {calculation.paidCarats.toLocaleString()}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 2. Total Tickets */}
                    <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40">
                        <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5 text-teal-600" />
                            <span>{calculation.isPredictionsEnabled ? 'Total Pulls via Tiket' : 'Tiket Gacha Dimiliki'}</span>
                        </span>
                        <div className="mt-2 text-2xl font-black font-mono text-teal-900 dark:text-teal-100">
                            {calculation.activeTotalTickets} <span className="text-sm font-bold text-slate-500">Pulls</span>
                        </div>
                        <div className="mt-1 text-[11px] text-teal-700/80 dark:text-teal-300/70">
                            {calculation.isPredictionsEnabled ? (
                                <span>Milik: {calculation.currentTicketsPulls} ({calculation.targetBannerType === 'support' ? 'Support' : 'Char'}) | +Proyeksi: {calculation.grandProjectedTickets}</span>
                            ) : (
                                <span>{calculation.characterTickets} char + {calculation.supportTickets} support</span>
                            )}
                        </div>
                    </div>

                    {/* 3. Pull Capacity */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
                        <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Kapasitas Tarikan</span>
                        </span>
                        <div className="mt-2 text-2xl font-black font-mono text-indigo-900 dark:text-indigo-100">
                            {calculation.activeTotalPulls} <span className="text-sm font-bold text-slate-500">Tarikan</span>
                        </div>
                        <div className="mt-1 text-[11px] text-indigo-700/80 dark:text-indigo-300/70">
                            {(calculation.activeTotalPulls / 200).toFixed(2)}x Spark Goal ({calculation.isPredictionsEnabled ? 'Dengan Prediksi' : 'Saldo Saat Ini'})
                        </div>
                    </div>

                    {/* 4. Daily Grinding Target / Status Defisit */}
                    <div className={`p-4 rounded-2xl border ${
                        calculation.isGuaranteed 
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800' 
                            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/50'
                    }`}>
                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Flame className="w-3.5 h-3.5 text-rose-500" />
                            <span>{calculation.isPredictionsEnabled ? 'Beban Carat Harian' : 'Kekurangan Saldo Spark'}</span>
                        </span>
                        <div className={`mt-2 text-2xl font-black font-mono ${
                            calculation.isGuaranteed ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                            {calculation.isGuaranteed ? '0' : (
                                calculation.isPredictionsEnabled 
                                    ? `${calculation.dailyCaratDeficit.toLocaleString()}` 
                                    : `${calculation.caratDeficit.toLocaleString()}`
                            )}
                            <span className="text-xs font-bold text-slate-500">
                                {calculation.isPredictionsEnabled ? ' Carat/Hari' : ' Carat'}
                            </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {calculation.isGuaranteed ? (
                                calculation.isPredictionsEnabled ? 'Aman, target terjamin!' : 'Aman, saldo siap spark hari ini!'
                            ) : (
                                calculation.isPredictionsEnabled ? `Harus dicari selama ${calculation.diffDays} hari` : 'Kekurangan dari saldo saat ini'
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Sections & Calculator Parameters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (5 Cols): Assets & Target Date */}
                <div className="lg:col-span-5 space-y-6">
                    {/* 1. Saldo Aset Saat Ini */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Saldo Aset Saat Ini
                            </h3>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Free Carats (Jewel Gratis)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={config.free_carats}
                                    onChange={(e) => setConfig({ ...config, free_carats: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Paid Carats (Jewel Berbayar)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={config.paid_carats}
                                    onChange={(e) => setConfig({ ...config, paid_carats: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Tiket Gacha Karakter
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={config.character_tickets}
                                        onChange={(e) => setConfig({ ...config, character_tickets: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-1">Khusus banner karakter</span>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Tiket Gacha Support Card
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={config.support_tickets}
                                        onChange={(e) => setConfig({ ...config, support_tickets: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-1">Khusus banner support card</span>
                                </div>
                            </div>

                            {/* Live Pulls Calculator dari Aset Saat Ini */}
                            <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Kapasitas Tarikan Saat Ini</span>
                                    </span>
                                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                        {calculation.currentTotalPulls} <span className="text-xs font-bold text-slate-500">Pulls</span>
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                                        <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                            Dari Carat ({calculation.currentCarats.toLocaleString()})
                                        </span>
                                        <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                                            {calculation.currentCaratsPulls} <span className="text-[10px] font-bold text-slate-400">Pulls</span>
                                        </div>
                                        {calculation.currentCaratsRemainder > 0 && (
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-mono">
                                                (sisa {calculation.currentCaratsRemainder} Carat)
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                                        <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                            Dari Tiket {calculation.targetBannerType === 'support' ? 'Support' : 'Karakter'}
                                        </span>
                                        <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                                            {calculation.currentTicketsPulls} <span className="text-[10px] font-bold text-slate-400">Pulls</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 block font-mono">
                                            {calculation.characterTickets} char + {calculation.supportTickets} card
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>Setara Nilai Total:</span>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                        {(calculation.currentTotalPulls * 150).toLocaleString()} Carat
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Target Banner & Spark Goal */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <Target className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Target Banner & Spark
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {/* Pilihan Target Banner: Karakter vs Support Card */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Tipe Target Banner Gacha
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, target_banner_type: 'character' })}
                                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                                            (config.target_banner_type || 'character') === 'character'
                                                ? 'bg-gradient-to-br from-pink-600 to-rose-600 text-white border-pink-500 shadow-md shadow-pink-600/20 font-black'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-pink-300'
                                        }`}
                                    >
                                        <span className="text-xs font-black">🏇 Banner Karakter</span>
                                        <span className="text-[10px] opacity-85">Carat + Tiket Karakter</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, target_banner_type: 'support' })}
                                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                                            config.target_banner_type === 'support'
                                                ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                        }`}
                                    >
                                        <span className="text-xs font-black">🃏 Banner Support Card</span>
                                        <span className="text-[10px] opacity-85">Carat + Tiket Support Card</span>
                                    </button>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed">
                                    *Di server JP, tiket gacha karakter hanya berlaku untuk banner karakter, dan tiket kartu bantuan hanya berlaku untuk banner support card.
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Tanggal Target Banner Impian
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={config.target_date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setConfig({ ...config, target_date: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
                                    <span>Rentang Waktu:</span>
                                    <span className="font-mono font-bold text-emerald-600">
                                        {calculation.diffDays} Hari ({calculation.diffWeeks} Minggu)
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Pilihan Goal Spark
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { val: 0.5, label: '0.5x Spark', pulls: '100 Pulls', carat: '15k' },
                                        { val: 1.0, label: '1x Spark', pulls: '200 Pulls', carat: '30k' },
                                        { val: 2.0, label: '2x Spark', pulls: '400 Pulls', carat: '60k' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            type="button"
                                            onClick={() => setConfig({ ...config, spark_goal_multiplier: opt.val })}
                                            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                                parseFloat(config.spark_goal_multiplier) === opt.val
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 font-black'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                            }`}
                                        >
                                            <div className="text-xs font-black">{opt.label}</div>
                                            <div className="text-[10px] opacity-80">{opt.pulls}</div>
                                            <div className="text-[9px] font-mono mt-0.5 opacity-90">{opt.carat} Carats</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (7 Cols): Income Accordions */}
                <div className="lg:col-span-7 space-y-4">
                    {/* A. F2P Routine Income */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleAccordion('f2p')}
                            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                        A. Rutinitas F2P Harian & Mingguan
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Daily missions (30/hari), Login bonus siklus 8 hari, dan Team Stadium mingguan
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                                    +{calculation.totalF2pCarats.toLocaleString()} Carat
                                </span>
                                {expandedAccordion.f2p ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                        </button>

                        {expandedAccordion.f2p && (
                            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={config.f2p_daily_missions}
                                            onChange={(e) => setConfig({ ...config, f2p_daily_missions: e.target.checked })}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Daily Missions (30 Carats / Hari)</span>
                                    </label>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        +{calculation.dailyMissions.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={config.f2p_login_bonus}
                                            onChange={(e) => setConfig({ ...config, f2p_login_bonus: e.target.checked })}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Login Bonus (110 Carats per 8 Hari = ~13,75/hari)</span>
                                    </label>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        +{calculation.loginBonus.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.f2p_training_pass !== false}
                                                onChange={(e) => setConfig({ ...config, f2p_training_pass: e.target.checked })}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>Free Training Pass (500 Carat / Bulan)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            Reward pass gratis reguler untuk semua trainer (cair tiap periode)
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        +{calculation.f2pPassCarats.toLocaleString()}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                            Team Stadium Weekly Class
                                        </label>
                                        <span className="text-[11px] text-slate-400">
                                            Reward dihitung per pekan ({calculation.diffWeeks} minggu)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={config.stadium_class}
                                            onChange={(e) => setConfig({ ...config, stadium_class: parseInt(e.target.value, 10) })}
                                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                                        >
                                            <option value={6}>Class 6 (250 Carat/mgg)</option>
                                            <option value={5}>Class 5 (200 Carat/mgg)</option>
                                            <option value={4}>Class 4 (150 Carat/mgg)</option>
                                            <option value={3}>Class 3 (100 Carat/mgg)</option>
                                            <option value={2}>Class 2 (70 Carat/mgg)</option>
                                            <option value={1}>Class 1 (50 Carat/mgg)</option>
                                            <option value={0}>Tidak Ikut (0 Carat)</option>
                                        </select>
                                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 min-w-[60px] text-right">
                                            +{calculation.stadiumCarats.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* B. Monthly Shop Tickets (Friendship & Cleat / Horseshoe) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleAccordion('shop')}
                            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                                    <ShoppingBag className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                        B. Tiket Toko Bulanan (Friendship & Cleat Shop)
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Reset tiap tanggal 1: FP Shop & Cleat/Horseshoe Shop (銀・金・虹の蹄鉄)
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-black text-teal-600 dark:text-teal-400">
                                    {config.target_banner_type === 'character' ? (
                                        `+${calculation.totalShopCharTickets} Tiket Karakter`
                                    ) : config.target_banner_type === 'support' ? (
                                        `+${calculation.totalShopSuppTickets} Tiket Support`
                                    ) : (
                                        `+${calculation.totalShopCharTickets + calculation.totalShopSuppTickets} Tiket Gacha`
                                    )}
                                </span>
                                {expandedAccordion.shop ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                        </button>

                        {expandedAccordion.shop && (
                            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                                    <span>
                                        Dihitung berdasarkan perkiraan <strong>{calculation.shopResetCount}x reset bulanan</strong> hingga tanggal target. Tiket Karakter dan Tiket Support Card dibeli secara terpisah di toko server JP.
                                    </span>
                                </div>

                                {/* 1. Friendship Point Shop */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.shop_friendship_enabled !== false}
                                                onChange={(e) => setConfig({ ...config, shop_friendship_enabled: e.target.checked })}
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                            />
                                            <span>Friendship Point Shop (フレンドPtショップ)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            1 Tiket Karakter & 1 Tiket Support Card per bulan @ 20.000 FP (Total 40.000 FP)
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 text-right">
                                        +{calculation.shopFriendshipCharTickets} Chara / +{calculation.shopFriendshipSuppTickets} Supp
                                    </span>
                                </div>

                                {/* 2. Silver Horseshoe */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.shop_horseshoe_silver !== false}
                                                onChange={(e) => setConfig({ ...config, shop_horseshoe_silver: e.target.checked })}
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                            />
                                            <span>Silver Horseshoe / Cleat Shop (銀の蹄鉄)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            2 Tiket Karakter & 2 Tiket Support Card per bulan (dari recycle kartu R/SR)
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 text-right">
                                        +{calculation.shopSilverCharTickets} Chara / +{calculation.shopSilverSuppTickets} Supp
                                    </span>
                                </div>

                                {/* 3. Gold Horseshoe */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.shop_horseshoe_gold !== false}
                                                onChange={(e) => setConfig({ ...config, shop_horseshoe_gold: e.target.checked })}
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                            />
                                            <span>Gold Horseshoe / Cleat Shop (金の蹄鉄)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            2 Tiket Karakter & 2 Tiket Support Card per bulan (dari recycle kartu SR)
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 text-right">
                                        +{calculation.shopGoldCharTickets} Chara / +{calculation.shopGoldSuppTickets} Supp
                                    </span>
                                </div>

                                {/* 4. Rainbow Horseshoe (Optional) */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.shop_horseshoe_rainbow === true}
                                                onChange={(e) => setConfig({ ...config, shop_horseshoe_rainbow: e.target.checked })}
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                            />
                                            <span className="flex items-center gap-1.5">
                                                <span>Rainbow Horseshoe Shop (虹の蹄鉄)</span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">Opsional</span>
                                            </span>
                                        </label>
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400 pl-6.5 block">
                                            2 Chara + 2 Support / bln. Membutuhkan release kartu SSR gacha (Hanya disarankan jika ada SSR ekstra)
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 text-right">
                                        +{calculation.shopRainbowCharTickets} Chara / +{calculation.shopRainbowSuppTickets} Supp
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* C. Competitive Monthly Rewards */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleAccordion('competitive')}
                            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                    <Trophy className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                        C. Hadiah Kompetitif Bulanan
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Circle Ranking (cair tiap tanggal 1) & Champions Meeting / LoH
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                                    +{calculation.totalCompetitiveCarats.toLocaleString()} Carat
                                </span>
                                {expandedAccordion.competitive ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                        </button>

                        {expandedAccordion.competitive && (
                            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                {/* Circle Ranking */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                            Circle Ranking Bulanan (Cair tgl 1)
                                        </label>
                                        <span className="text-[11px] text-slate-400">
                                            Target tier rank circle Anda di server JP
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={config.circle_rank}
                                            onChange={(e) => setConfig({ ...config, circle_rank: e.target.value })}
                                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                                        >
                                            <option value="SS">Rank SS (3.000 Carat)</option>
                                            <option value="S+">Rank S+ (2.400 Carat)</option>
                                            <option value="S">Rank S (2.100 Carat)</option>
                                            <option value="A+">Rank A+ (1.800 Carat)</option>
                                            <option value="A">Rank A (1.500 Carat)</option>
                                            <option value="B+">Rank B+ (1.200 Carat)</option>
                                            <option value="B">Rank B (900 Carat)</option>
                                            <option value="C+">Rank C+ (600 Carat)</option>
                                            <option value="C">Rank C (300 Carat)</option>
                                            <option value="D+">Rank D+ (150 Carat)</option>
                                            <option value="Unranked">Unranked / 0 Carat</option>
                                        </select>
                                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 min-w-[60px] text-right">
                                            +{calculation.circleCarats.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Champions Meeting / LoH */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                            Champions Meeting / League of Heroes
                                        </label>
                                        <span className="text-[11px] text-slate-400">
                                            Proyeksi hasil turnamen PvP bulanan (~{calculation.monthsCount} event)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={config.champions_meeting_target}
                                            onChange={(e) => setConfig({ ...config, champions_meeting_target: e.target.value })}
                                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white max-w-[280px]"
                                        >
                                            <optgroup label="Champions Meeting (Grade League)">
                                                {Object.entries(CM_OPTIONS).filter(([_, item]) => item.group === 'Champions Meeting (Grade League)').map(([key, item]) => (
                                                    <option key={key} value={key}>{item.label}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="League of Heroes (Cumulative Tiers)">
                                                {Object.entries(CM_OPTIONS).filter(([k, item]) => item.group === 'League of Heroes (Cumulative Tier)' && k !== 'loh_platinum').map(([key, item]) => (
                                                    <option key={key} value={key}>{item.label}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Lainnya">
                                                <option value="none">Tidak Mengikuti / Skip Hadiah (0 Carat)</option>
                                            </optgroup>
                                        </select>
                                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 min-w-[70px] text-right whitespace-nowrap">
                                            +{calculation.cmCarats.toLocaleString()} Carat{calculation.cmTickets > 0 ? ` + ${calculation.cmTickets} Tiket` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* D. PvE Events & Livestreams */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleAccordion('pve')}
                            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                                    <Gift className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                        D. Event PvE & PakaLive Stream
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Story Events, Legend Race, G1 Bonus, & PakaLive Gift
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
                                    +{calculation.totalPveCarats.toLocaleString()} Carat
                                </span>
                                {expandedAccordion.pve ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                        </button>

                        {expandedAccordion.pve && (
                            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Story Events */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                                Story Event (1.000 Carat)
                                            </label>
                                            <span className="text-[10px] text-slate-400">Cerita, misi & roulette</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={config.story_events_count}
                                            onChange={(e) => setConfig({ ...config, story_events_count: parseInt(e.target.value, 10) || 0 })}
                                            className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-center text-slate-800 dark:text-white"
                                        />
                                    </div>

                                    {/* Legend Race */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                                Legend Race (150 Carat)
                                            </label>
                                            <span className="text-[10px] text-slate-400">1 bos first-clear</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={config.legend_races_count}
                                            onChange={(e) => setConfig({ ...config, legend_races_count: parseInt(e.target.value, 10) || 0 })}
                                            className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-center text-slate-800 dark:text-white"
                                        />
                                    </div>

                                    {/* PakaLive Stream */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                                PakaLive TV Gift (1.500 Carat)
                                            </label>
                                            <span className="text-[10px] text-slate-400">Siaran resmi bulanan JP</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={config.pakalive_streams_count}
                                            onChange={(e) => setConfig({ ...config, pakalive_streams_count: parseInt(e.target.value, 10) || 0 })}
                                            className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-center text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.g1_bonus_enabled}
                                                onChange={(e) => setConfig({ ...config, g1_bonus_enabled: e.target.checked })}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>G1 Commemorative Race Bonus (Musiman, ~300 Carat / Bulan)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            Estimasi ~2 balapan G1 per bulan saat aktif musim pacuan JP
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        +{calculation.g1Carats.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* E. Paid Subscription Passes */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleAccordion('passes')}
                            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                    <Crown className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                        E. Langganan Berbayar (Opsional)
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Daily Jewel Pack & Premium Training Pass
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                                    +{calculation.totalPassesCarats.toLocaleString()} Carat
                                </span>
                                {expandedAccordion.passes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                        </button>

                        {expandedAccordion.passes && (
                            <div className="p-6 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.daily_jewel_pack}
                                                onChange={(e) => setConfig({ ...config, daily_jewel_pack: e.target.checked })}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Daily Jewel Pack (30 Hari)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            500 Paid Carat saat aktivasi + 50 Free Carat setiap hari
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                        +{calculation.dailyPackCarats.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <input
                                                type="checkbox"
                                                checked={config.trainer_pass}
                                                onChange={(e) => setConfig({ ...config, trainer_pass: e.target.checked })}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Premium Training Pass (¥800 / Bulan)</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 pl-6.5 block">
                                            350 Paid + 1.350 Free Carats (Total 1.700) & 4 Tiket Gacha (2 Karakter + 2 Support)
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 block">
                                            +{calculation.trainerPassCarats.toLocaleString()}
                                        </span>
                                        {config.trainer_pass && (
                                            <span className="text-[10px] font-mono text-blue-500 dark:text-blue-300">
                                                +{calculation.trainerPassTickets} Tiket
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
