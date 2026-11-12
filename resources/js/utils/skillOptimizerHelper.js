/**
 * Uma Musume JP Server Skill Optimizer & Knapsack Solver Helper
 * Based on benchmark algorithms adapted from https://beta.daftuyda.moe/optimizer (Mode Server = JP)
 */

import { calculateSkillRating } from './ratingCalculatorHelper.js';
import catalog from '../data/ratingSkillsCatalog.json' with { type: 'json' };

const catalogBySkillId = new Map(catalog.map(skill => [String(skill.id), skill]));

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
            replacedSkillIds: [],
            totalCostPt: 0,
            remainingPt: budget,
            totalRatingGain: 0,
            averageEfficiency: 0,
            hasLockedUnaffordable: false,
        };
    }

    const preparedCandidates = candidates.map((candidate, candidateIndex) => {
        const skillId = String(candidate.skillId || candidate.id);
        const skill = { ...catalogBySkillId.get(skillId), ...candidate };
        const baseCost = candidate.base_cost ?? candidate.cost ?? skill.base_cost ?? skill.cost ?? 160;
        const hintLevel = Math.max(0, Math.min(5, parseInt(candidate.hintLevel, 10) || 0));

        return {
            ...skill,
            candidateIndex,
            skillId,
            baseCost,
            hintLevel,
            discountedCost: calculateDiscountedSkillCost(baseCost, hintLevel, isFastLearner),
            effectiveScore: calculateSkillRating(skill, raceConfig),
            isLocked: Boolean(candidate.isLocked),
        };
    });
    const candidateBySkillId = new Map(preparedCandidates.map(item => [item.skillId, item]));
    const findSkill = id => candidateBySkillId.get(id) ?? catalogBySkillId.get(id);
    const findPrerequisiteId = skill => String(skill?.prereq_id || skill?.lower_id || '');

    const coveredPrerequisites = new Set();
    for (const ownedId of ownedSet) {
        let prerequisiteId = findPrerequisiteId(findSkill(ownedId));
        while (prerequisiteId && !coveredPrerequisites.has(prerequisiteId)) {
            coveredPrerequisites.add(prerequisiteId);
            prerequisiteId = findPrerequisiteId(findSkill(prerequisiteId));
        }
    }

    const reasons = new Map();
    const optionsByCandidate = new Map();
    const optionsByGroup = new Map();
    const maxBudgetCap = Math.min(budget, 50000);

    for (const item of preparedCandidates) {
        if (ownedSet.has(item.skillId) || coveredPrerequisites.has(item.skillId)) {
            reasons.set(item.candidateIndex, 'already_owned');
            continue;
        }

        const chain = new Map([[item.skillId, item.discountedCost]]);
        let groupId = item.skillId;
        let prerequisiteId = findPrerequisiteId(item);
        let ownedPrerequisiteId = null;
        while (prerequisiteId && !chain.has(prerequisiteId)) {
            const prerequisite = findSkill(prerequisiteId);
            if (ownedSet.has(prerequisiteId)) {
                ownedPrerequisiteId = prerequisiteId;
                groupId = prerequisiteId;
                prerequisiteId = '';
                break;
            }
            if (coveredPrerequisites.has(prerequisiteId) || !prerequisite) break;

            const cost = prerequisite.discountedCost ?? calculateDiscountedSkillCost(
                prerequisite.base_cost ?? prerequisite.cost, 0, isFastLearner,
            );
            chain.set(prerequisiteId, cost);
            groupId = prerequisiteId;
            prerequisiteId = findPrerequisiteId(prerequisite);
        }

        if (prerequisiteId) {
            reasons.set(item.candidateIndex, coveredPrerequisites.has(prerequisiteId) ? 'conflicting_upgrade' : 'missing_prerequisite');
            continue;
        }

        const option = {
            item,
            groupId,
            chain,
            ownedPrerequisiteId,
            totalCost: [...chain.values()].reduce((sum, cost) => sum + cost, 0),
            totalScore: item.effectiveScore - calculateSkillRating(findSkill(ownedPrerequisiteId), raceConfig),
        };
        optionsByCandidate.set(item.candidateIndex, option);
        if (!optionsByGroup.has(groupId)) {
            optionsByGroup.set(groupId, [{ chain: new Map(), totalCost: 0, totalScore: 0 }]);
        }
        optionsByGroup.get(groupId).push(option);
    }

    // Accept locks in input order, reserving only the extra cost within a chain.
    const reservedCostByGroup = new Map();
    let reservedCost = 0;
    for (const item of preparedCandidates) {
        const option = optionsByCandidate.get(item.candidateIndex);
        if (!item.isLocked || !option) continue;

        const { groupId } = option;
        const compatibleOptions = optionsByGroup.get(groupId).filter(choice => choice.chain.has(item.skillId));
        if (compatibleOptions.length === 0) {
            reasons.set(item.candidateIndex, 'conflicting_upgrade');
            continue;
        }

        const minimumCost = Math.min(...compatibleOptions.map(choice => choice.totalCost));
        const extraCost = minimumCost - (reservedCostByGroup.get(groupId) ?? 0);
        if (reservedCost + extraCost > maxBudgetCap) {
            reasons.set(item.candidateIndex, 'insufficient_budget');
            continue;
        }

        reservedCost += extraCost;
        reservedCostByGroup.set(groupId, minimumCost);
        optionsByGroup.set(groupId, compatibleOptions);
    }

    // Solve the grouped knapsack, keeping one final skill per prerequisite chain.
    const groups = [...optionsByGroup.values()];
    const G = groups.length;

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

    const recommendedSkills = [];
    const selectedCandidateIndices = new Set();
    const selectedChains = new Map();
    const replacedSkillIds = new Set();
    let currB = bestBudget;

    for (let g = G - 1; g >= 0; g--) {
        const option = groups[g][choice[g][currB]];
        currB -= option.totalCost;
        if (!option.item) continue;

        selectedChains.set(option.groupId, option.chain);
        if (option.ownedPrerequisiteId) replacedSkillIds.add(option.ownedPrerequisiteId);

        let purchaseCost = 0;
        for (const [id, cost] of [...option.chain].reverse()) {
            if (id !== option.item.skillId) replacedSkillIds.add(id);
            purchaseCost += cost;
            const candidate = candidateBySkillId.get(id);
            if (!candidate) continue;

            selectedCandidateIndices.add(candidate.candidateIndex);
            recommendedSkills.push({
                ...candidate,
                purchaseCost,
                ratingGain: id === option.item.skillId ? option.totalScore : 0,
            });
            purchaseCost = 0;
        }
    }

    const totalCostPt = bestBudget;
    const remainingPt = budget - totalCostPt;
    const totalRatingGain = Math.round(bestScore);
    const averageEfficiency = totalCostPt > 0 ? Number((totalRatingGain / totalCostPt).toFixed(2)) : 0;

    const unselectedSkills = preparedCandidates
        .filter(item => !selectedCandidateIndices.has(item.candidateIndex))
        .map(item => {
            const option = optionsByCandidate.get(item.candidateIndex);
            let reason = reasons.get(item.candidateIndex);
            if (option && !reason) {
                const selectedChain = selectedChains.get(option.groupId);
                const additionalCost = [...option.chain].reduce(
                    (sum, [id, cost]) => sum + (selectedChain?.has(id) ? 0 : cost), 0,
                );
                if (additionalCost > remainingPt) reason = 'insufficient_budget';
            }
            return { ...item, requiredCost: option?.totalCost ?? item.discountedCost, reason };
        });

    return {
        recommendedSkills,
        unselectedSkills,
        replacedSkillIds: [...replacedSkillIds],
        totalCostPt,
        remainingPt,
        totalRatingGain,
        averageEfficiency,
        hasLockedUnaffordable: unselectedSkills.some(item => item.isLocked && item.reason === 'insufficient_budget'),
    };
}
