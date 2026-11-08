/**
 * Uma Musume JP Server Skill Optimizer & Knapsack Solver Helper
 * Based on benchmark algorithms adapted from https://beta.daftuyda.moe/optimizer (Mode Server = JP)
 */

import { calculateSkillRating } from './ratingCalculatorHelper.js';

// Official JP server hint discount rates
export const HINT_DISCOUNTS = {
    0: 0.0,
    1: 0.10,
    2: 0.20,
    3: 0.30,
    4: 0.35,
    5: 0.40,
};

export const FAST_LEARNER_DISCOUNT = 0.10;

/**
 * Calculate discounted skill cost based on Hint Level (0-5) and Fast Learner status.
 * Formula matches official JP server rounding rules:
 * rawCost = baseCost * max(0, 1 - hintDiscount - fastLearnerDiscount)
 * cost = floor(rawCost + 1e-9)
 *
 * @param {number} baseCost - Base skill points cost
 * @param {number|string} hintLevel - Hint Level (0 to 5)
 * @param {boolean} isFastLearner - Whether trainer has Fast Learner (切れ者) status
 * @returns {number}
 */
export function calculateDiscountedSkillCost(baseCost, hintLevel = 0, isFastLearner = false) {
    const cost = Number(baseCost);
    if (!Number.isFinite(cost) || cost <= 0) {
        return 0;
    }

    const lvl = Math.max(0, Math.min(5, parseInt(hintLevel, 10) || 0));
    const hintDiscount = HINT_DISCOUNTS[lvl] ?? 0;
    const fastLearnerDiscount = isFastLearner ? FAST_LEARNER_DISCOUNT : 0;
    const multiplier = Math.max(0, 1 - hintDiscount - fastLearnerDiscount);
    const rawCost = cost * multiplier;
    const epsilon = 1e-9;

    return Math.max(0, Math.floor(rawCost + epsilon));
}

/**
 * Calculate cost efficiency ratio (rating gain per 1 Skill Point spent)
 *
 * @param {number} ratingGain - Evaluation points gained
 * @param {number} netCost - Skill points cost
 * @returns {{ ratio: number, tier: string, tierColor: string }}
 */
export function calculateSkillEfficiency(ratingGain, netCost) {
    const gain = Number(ratingGain) || 0;
    const cost = Number(netCost) || 0;

    if (cost <= 0) {
        return {
            ratio: gain > 0 ? 999 : 0,
            tier: 'Tier S+ (Gratis)',
            tierColor: 'emerald',
            badgeClass: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30',
        };
    }

    const ratio = Number((gain / cost).toFixed(2));

    if (ratio >= 2.0) {
        return {
            ratio,
            tier: 'Tier S (Sangat Efisien)',
            tierColor: 'emerald',
            badgeClass: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30',
        };
    }

    if (ratio >= 1.5) {
        return {
            ratio,
            tier: 'Tier A (Efisien)',
            tierColor: 'teal',
            badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
        };
    }

    if (ratio >= 1.0) {
        return {
            ratio,
            tier: 'Tier B (Standar)',
            tierColor: 'sky',
            badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
        };
    }

    return {
        ratio,
        tier: 'Tier C (Rendah)',
        tierColor: 'slate',
        badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    };
}

/**
 * Solve optimal skill combination via Grouped / 0-1 Knapsack Dynamic Programming.
 * Handles exclusive prerequisite chains (White -> Gold, ○ -> ◎, and Evolved skills)
 * and locked skills.
 *
 * @param {Object} params
 * @param {number} params.budgetPt - Total remaining Skill Points (Pt)
 * @param {Array<Object>} params.candidates - Array of candidate skill items
 * @param {Object} [params.raceConfig={}] - Trainee race configuration for aptitude scaling
 * @param {boolean} [params.isFastLearner=false] - Whether Fast Learner discount is active
 * @param {Array<number|string>} [params.alreadyOwnedSkillIds=[]] - IDs of already learned skills
 * @returns {Object} Result summary
 */
export function optimizeSkillBuild({
    budgetPt = 0,
    candidates = [],
    raceConfig = {},
    isFastLearner = false,
    alreadyOwnedSkillIds = [],
}) {
    const budget = Math.max(0, parseInt(budgetPt, 10) || 0);
    const ownedSet = new Set((alreadyOwnedSkillIds || []).map(id => String(id)));

    if (!Array.isArray(candidates) || candidates.length === 0) {
        return {
            recommendedSkills: [],
            unselectedSkills: [],
            totalCostPt: 0,
            remainingPt: budget,
            totalRatingGain: 0,
            averageEfficiency: 0,
            hasLockedUnaffordable: false,
        };
    }

    // 1. Prepare candidates with costs, rating gains, and prerequisite links
    const candidateMap = new Map();
    const candidateBySkillId = new Map();

    const preparedCandidates = candidates.map((cand, idx) => {
        const skillId = cand.skillId || cand.id;
        const baseCost = cand.base_cost ?? cand.cost ?? 160;
        const hintLvl = Math.max(0, Math.min(5, parseInt(cand.hintLevel, 10) || 0));
        const discountedCost = calculateDiscountedSkillCost(baseCost, hintLvl, isFastLearner);

        // Effective rating score using trainee race configuration
        const effectiveScore = calculateSkillRating(cand, raceConfig);

        const item = {
            ...cand,
            candidateIndex: idx,
            skillId: String(skillId),
            prereqId: cand.prereq_id ? String(cand.prereq_id) : (cand.lower_id ? String(cand.lower_id) : null),
            baseCost,
            hintLevel: hintLvl,
            discountedCost,
            effectiveScore,
            isLocked: Boolean(cand.isLocked),
        };

        candidateMap.set(String(item.id || idx), item);
        candidateBySkillId.set(String(skillId), item);
        return item;
    });

    // 2. Identify prerequisite chains and group exclusive options
    // Group options: each group contains mutually exclusive choices
    // e.g. Group A: [None, White Only, Gold Upgrade (includes White if unowned)]
    const usedCandidateIndices = new Set();
    const groups = [];

    // Prioritize processing:
    // 1. Evolution skills
    // 2. Gold skills with prerequisites
    // 3. Double Circle skills (◎)
    // 4. Standalone skills
    const sortedIndices = [...preparedCandidates.keys()].sort((a, b) => {
        const itemA = preparedCandidates[a];
        const itemB = preparedCandidates[b];
        const pA = itemA.is_evo || itemA.rarity === 'Evolution' ? 0 : (itemA.rarity === 'Gold' ? 1 : (itemA.name_en?.includes('◎') ? 2 : 3));
        const pB = itemB.is_evo || itemB.rarity === 'Evolution' ? 0 : (itemB.rarity === 'Gold' ? 1 : (itemB.name_en?.includes('◎') ? 2 : 3));
        return pA - pB;
    });

    for (const idx of sortedIndices) {
        if (usedCandidateIndices.has(idx)) continue;

        const mainItem = preparedCandidates[idx];
        const prereqId = mainItem.prereqId;
        const prereqInCandidates = prereqId ? candidateBySkillId.get(prereqId) : null;
        const isPrereqOwned = prereqId ? ownedSet.has(prereqId) : false;

        // Case A: Skill with an unowned prerequisite that is also in candidate pool
        if (prereqInCandidates && !isPrereqOwned && !usedCandidateIndices.has(prereqInCandidates.candidateIndex)) {
            const lowerItem = prereqInCandidates;
            usedCandidateIndices.add(idx);
            usedCandidateIndices.add(lowerItem.candidateIndex);

            const isMainLocked = mainItem.isLocked;
            const isLowerLocked = lowerItem.isLocked;

            const groupOptions = [];

            // Option 0: None (only if neither is locked)
            if (!isMainLocked && !isLowerLocked) {
                groupOptions.push({
                    type: 'none',
                    items: [],
                    totalCost: 0,
                    totalScore: 0,
                });
            }

            // Option 1: Lower / White only (only if main is not locked)
            if (!isMainLocked) {
                groupOptions.push({
                    type: 'lower_only',
                    items: [lowerItem],
                    totalCost: lowerItem.discountedCost,
                    totalScore: lowerItem.effectiveScore,
                });
            }

            // Option 2: Full upgrade (Lower + Main Gold / Double Circle)
            // In rating calculation, Gold replaces White rating
            groupOptions.push({
                type: 'full_upgrade',
                items: [lowerItem, mainItem],
                totalCost: lowerItem.discountedCost + mainItem.discountedCost,
                totalScore: mainItem.effectiveScore, // Gold replaces White in rating!
            });

            groups.push(groupOptions);
            continue;
        }

        // Case B: Skill with an unowned prerequisite NOT in candidate pool
        // To buy this skill, prerequisite White skill must be purchased at base cost
        if (prereqId && !isPrereqOwned && !prereqInCandidates) {
            usedCandidateIndices.add(idx);
            const lowerBaseCost = mainItem.rarity === 'Gold' ? 160 : 100;
            const lowerCost = calculateDiscountedSkillCost(lowerBaseCost, 0, isFastLearner);
            const totalCost = mainItem.discountedCost + lowerCost;

            const groupOptions = [];
            if (!mainItem.isLocked) {
                groupOptions.push({
                    type: 'none',
                    items: [],
                    totalCost: 0,
                    totalScore: 0,
                });
            }
            groupOptions.push({
                type: 'with_external_prereq',
                items: [mainItem],
                totalCost,
                totalScore: mainItem.effectiveScore,
            });

            groups.push(groupOptions);
            continue;
        }

        // Case C: Standalone skill or prerequisite is ALREADY owned!
        usedCandidateIndices.add(idx);
        const netCost = mainItem.discountedCost;
        // If prerequisite is already owned, net rating gain is main - lower
        let netScore = mainItem.effectiveScore;
        if (prereqId && isPrereqOwned) {
            const lowerScore = mainItem.rarity === 'Gold' ? 217 : 129;
            netScore = Math.max(0, mainItem.effectiveScore - lowerScore);
        }

        const groupOptions = [];
        if (!mainItem.isLocked) {
            groupOptions.push({
                type: 'none',
                items: [],
                totalCost: 0,
                totalScore: 0,
            });
        }
        groupOptions.push({
            type: 'single',
            items: [mainItem],
            totalCost: netCost,
            totalScore: netScore,
        });

        groups.push(groupOptions);
    }

    // 3. Dynamic Programming Solver for Grouped Knapsack
    // Filter groups where mandatory items must be fulfilled
    const G = groups.length;
    const maxBudgetCap = Math.min(budget, 50000); // Safe budget limit

    // Table: dp[b] stores max score achievable with exact budget b
    const NEG_INF = -1e9;
    let dp = new Float64Array(maxBudgetCap + 1).fill(NEG_INF);
    dp[0] = 0;

    // Choice tracking for reconstruction: choice[groupIndex][budget] = optionIndex
    const choice = Array.from({ length: G }, () => new Int16Array(maxBudgetCap + 1).fill(-1));

    for (let g = 0; g < G; g++) {
        const options = groups[g];
        const nextDp = new Float64Array(maxBudgetCap + 1).fill(NEG_INF);

        for (let b = 0; b <= maxBudgetCap; b++) {
            if (dp[b] <= NEG_INF / 2) continue;

            for (let optIdx = 0; optIdx < options.length; optIdx++) {
                const opt = options[optIdx];
                const newBudget = b + opt.totalCost;

                if (newBudget <= maxBudgetCap) {
                    const newScore = dp[b] + opt.totalScore;
                    if (newScore > nextDp[newBudget]) {
                        nextDp[newBudget] = newScore;
                        choice[g][newBudget] = optIdx;
                    }
                }
            }
        }

        dp = nextDp;
    }

    // Find best budget spend <= budget
    let bestScore = NEG_INF;
    let bestBudget = 0;

    for (let b = 0; b <= maxBudgetCap; b++) {
        if (dp[b] > bestScore) {
            bestScore = dp[b];
            bestBudget = b;
        }
    }

    // If no valid solution found (e.g. locked skills exceed budget)
    if (bestScore <= NEG_INF / 2) {
        // Fallback: take as many locked skills as possible within budget
        const lockedItems = preparedCandidates.filter(c => c.isLocked);
        let fallbackCost = 0;
        let fallbackScore = 0;
        const selected = [];

        for (const item of lockedItems) {
            if (fallbackCost + item.discountedCost <= budget) {
                fallbackCost += item.discountedCost;
                fallbackScore += item.effectiveScore;
                selected.push(item);
            }
        }

        const selectedIndices = new Set(selected.map(s => s.candidateIndex));
        const unselected = preparedCandidates.filter(c => !selectedIndices.has(c.candidateIndex));

        return {
            recommendedSkills: selected,
            unselectedSkills: unselected,
            totalCostPt: fallbackCost,
            remainingPt: budget - fallbackCost,
            totalRatingGain: fallbackScore,
            averageEfficiency: fallbackCost > 0 ? Number((fallbackScore / fallbackCost).toFixed(2)) : 0,
            hasLockedUnaffordable: true,
        };
    }

    // 4. Backtrack reconstruction to recover selected items
    const chosenItems = [];
    let currB = bestBudget;

    for (let g = G - 1; g >= 0; g--) {
        const optIdx = choice[g][currB];
        if (optIdx >= 0) {
            const opt = groups[g][optIdx];
            for (const it of opt.items) {
                chosenItems.push(it);
            }
            currB -= opt.totalCost;
        }
    }

    // Deduplicate chosen items by candidateIndex
    const selectedMap = new Map();
    for (const it of chosenItems) {
        selectedMap.set(it.candidateIndex, it);
    }
    const recommendedSkills = Array.from(selectedMap.values());
    const recommendedIndexSet = new Set(recommendedSkills.map(s => s.candidateIndex));

    const unselectedSkills = preparedCandidates.filter(c => !recommendedIndexSet.has(c.candidateIndex));

    const totalCostPt = bestBudget;
    const remainingPt = Math.max(0, budget - totalCostPt);
    const totalRatingGain = Math.round(bestScore);
    const averageEfficiency = totalCostPt > 0 ? Number((totalRatingGain / totalCostPt).toFixed(2)) : 0;

    return {
        recommendedSkills,
        unselectedSkills,
        totalCostPt,
        remainingPt,
        totalRatingGain,
        averageEfficiency,
        hasLockedUnaffordable: false,
    };
}
