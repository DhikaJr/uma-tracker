/**
 * Uma Musume Pretty Derby - Rating & Evaluation Score Calculator Helper (JP Server)
 * Adapts exact in-game mechanics and community benchmarks (beta.daftuyda.moe / GameTora / Umakonga).
 */

export const MAX_STAT_VALUE = 3000;

// Stat score rates for 50-pt blocks (0-1200) and 10-pt blocks (1201-2000)
const R1 = [
    5, 8, 10, 13, 16, 18, 21, 24, 26, 28, 29, 30, 31, 33, 34, 35, 39, 41, 42, 43, 52, 55, 66,
    68, 68,
];
const R2 = [
    79, 80, 81, 83, 84, 85, 86, 88, 89, 90, 92, 93, 94, 96, 97, 98, 100, 101, 102, 103, 105,
    106, 107, 109, 110, 111, 113, 114, 115, 117, 118, 119, 121, 122, 123, 124, 126, 127, 128,
    130, 131, 132, 134, 135, 136, 138, 139, 140, 141, 143, 144, 145, 147, 148, 149, 151, 152,
    153, 155, 156, 157, 159, 160, 161, 162, 164, 165, 166, 168, 169, 170, 172, 173, 174, 176,
    177, 178, 179, 181, 182, 182,
];

// Pre-computed stat score table for 0 to 3000
export const STAT_SCORES = (() => {
    const sc = [0];
    let raw = 0;
    let idx = 0;
    let c;
    for (c = 1; c <= 1200; c++) {
        if (c <= 49) {
            idx = 0;
        } else if (c <= 99) {
            idx = 1;
        } else if (c % 50 === 0) {
            idx++;
        }
        raw += R1[idx];
        sc[c] = Math.round(raw / 10);
    }
    raw = 38413;
    idx = 0;
    for (c = 1201; c <= 2000; c++) {
        if (c <= 1209) {
            idx = 0;
        } else if (c <= 1219) {
            idx = 1;
        } else if (c % 10 === 0) {
            idx++;
        }
        raw += R2[idx];
        sc[c] = Math.round(raw / 10);
    }
    raw = 142796;
    idx = 0;
    let rate = 183;
    for (c = 2001; c <= MAX_STAT_VALUE; c++) {
        if (idx >= 25) {
            rate++;
            idx = 0;
        }
        raw += rate;
        idx++;
        sc[c] = Math.round(raw / 10);
    }
    return sc;
})();

/**
 * Complete list of 298 rank minimum thresholds from G to LS24 (JP Server standard).
 */
export const RANK_THRESHOLDS = [
    { rank: 'G', min: 0 },
    { rank: 'G+', min: 300 },
    { rank: 'F', min: 600 },
    { rank: 'F+', min: 900 },
    { rank: 'E', min: 1300 },
    { rank: 'E+', min: 1800 },
    { rank: 'D', min: 2300 },
    { rank: 'D+', min: 2900 },
    { rank: 'C', min: 3500 },
    { rank: 'C+', min: 4900 },
    { rank: 'B', min: 6500 },
    { rank: 'B+', min: 8200 },
    { rank: 'A', min: 10000 },
    { rank: 'A+', min: 12100 },
    { rank: 'S', min: 14500 },
    { rank: 'S+', min: 15900 },
    { rank: 'SS', min: 17500 },
    { rank: 'SS+', min: 19200 },
    { rank: 'UG', min: 19600 },
    { rank: 'UG1', min: 20000 },
    { rank: 'UG2', min: 20400 },
    { rank: 'UG3', min: 20800 },
    { rank: 'UG4', min: 21200 },
    { rank: 'UG5', min: 21600 },
    { rank: 'UG6', min: 22100 },
    { rank: 'UG7', min: 22500 },
    { rank: 'UG8', min: 23000 },
    { rank: 'UG9', min: 23400 },
    { rank: 'UF', min: 23900 },
    { rank: 'UF1', min: 24300 },
    { rank: 'UF2', min: 24800 },
    { rank: 'UF3', min: 25300 },
    { rank: 'UF4', min: 25800 },
    { rank: 'UF5', min: 26300 },
    { rank: 'UF6', min: 26800 },
    { rank: 'UF7', min: 27300 },
    { rank: 'UF8', min: 27800 },
    { rank: 'UF9', min: 28300 },
    { rank: 'UE', min: 28800 },
    { rank: 'UE1', min: 29400 },
    { rank: 'UE2', min: 29900 },
    { rank: 'UE3', min: 30400 },
    { rank: 'UE4', min: 31000 },
    { rank: 'UE5', min: 31500 },
    { rank: 'UE6', min: 32100 },
    { rank: 'UE7', min: 32700 },
    { rank: 'UE8', min: 33200 },
    { rank: 'UE9', min: 33800 },
    { rank: 'UD', min: 34400 },
    { rank: 'UD1', min: 35000 },
    { rank: 'UD2', min: 35600 },
    { rank: 'UD3', min: 36200 },
    { rank: 'UD4', min: 36800 },
    { rank: 'UD5', min: 37500 },
    { rank: 'UD6', min: 38100 },
    { rank: 'UD7', min: 38700 },
    { rank: 'UD8', min: 39400 },
    { rank: 'UD9', min: 40000 },
    { rank: 'UC', min: 40700 },
    { rank: 'UC1', min: 41300 },
    { rank: 'UC2', min: 42000 },
    { rank: 'UC3', min: 42700 },
    { rank: 'UC4', min: 43400 },
    { rank: 'UC5', min: 44000 },
    { rank: 'UC6', min: 44700 },
    { rank: 'UC7', min: 45400 },
    { rank: 'UC8', min: 46200 },
    { rank: 'UC9', min: 46900 },
    { rank: 'UB', min: 47600 },
    { rank: 'UB1', min: 48300 },
    { rank: 'UB2', min: 49100 },
    { rank: 'UB3', min: 49800 },
    { rank: 'UB4', min: 50600 },
    { rank: 'UB5', min: 51300 },
    { rank: 'UB6', min: 52100 },
    { rank: 'UB7', min: 52800 },
    { rank: 'UB8', min: 53600 },
    { rank: 'UB9', min: 54400 },
    { rank: 'UA', min: 55200 },
    { rank: 'UA1', min: 56000 },
    { rank: 'UA2', min: 56800 },
    { rank: 'UA3', min: 57600 },
    { rank: 'UA4', min: 58400 },
    { rank: 'UA5', min: 59200 },
    { rank: 'UA6', min: 60000 },
    { rank: 'UA7', min: 60800 },
    { rank: 'UA8', min: 61700 },
    { rank: 'UA9', min: 62500 },
    { rank: 'US', min: 63400 },
    { rank: 'US1', min: 64200 },
    { rank: 'US2', min: 65100 },
    { rank: 'US3', min: 66400 },
    { rank: 'US4', min: 67700 },
    { rank: 'US5', min: 69000 },
    { rank: 'US6', min: 70300 },
    { rank: 'US7', min: 71600 },
    { rank: 'US8', min: 72900 },
    { rank: 'US9', min: 74400 },
    { rank: 'LG', min: 76000 },
    { rank: 'LG1', min: 76600 },
    { rank: 'LG2', min: 77200 },
    { rank: 'LG3', min: 77800 },
    { rank: 'LG4', min: 78500 },
    { rank: 'LG5', min: 79100 },
    { rank: 'LG6', min: 79700 },
    { rank: 'LG7', min: 80400 },
    { rank: 'LG8', min: 81000 },
    { rank: 'LG9', min: 81700 },
    { rank: 'LG10', min: 82300 },
    { rank: 'LG11', min: 83000 },
    { rank: 'LG12', min: 83600 },
    { rank: 'LG13', min: 84300 },
    { rank: 'LG14', min: 84900 },
    { rank: 'LG15', min: 85600 },
    { rank: 'LG16', min: 86200 },
    { rank: 'LG17', min: 86700 },
    { rank: 'LG18', min: 87300 },
    { rank: 'LG19', min: 87900 },
    { rank: 'LG20', min: 88500 },
    { rank: 'LG21', min: 89100 },
    { rank: 'LG22', min: 89700 },
    { rank: 'LG23', min: 90300 },
    { rank: 'LG24', min: 90900 },
    { rank: 'LF', min: 91400 },
    { rank: 'LF1', min: 92000 },
    { rank: 'LF2', min: 92600 },
    { rank: 'LF3', min: 93200 },
    { rank: 'LF4', min: 93800 },
    { rank: 'LF5', min: 94400 },
    { rank: 'LF6', min: 95000 },
    { rank: 'LF7', min: 95600 },
    { rank: 'LF8', min: 96300 },
    { rank: 'LF9', min: 96900 },
    { rank: 'LF10', min: 97500 },
    { rank: 'LF11', min: 98100 },
    { rank: 'LF12', min: 98700 },
    { rank: 'LF13', min: 99300 },
    { rank: 'LF14', min: 99900 },
    { rank: 'LF15', min: 100500 },
    { rank: 'LF16', min: 101100 },
    { rank: 'LF17', min: 101600 },
    { rank: 'LF18', min: 102200 },
    { rank: 'LF19', min: 102700 },
    { rank: 'LF20', min: 103300 },
    { rank: 'LF21', min: 103800 },
    { rank: 'LF22', min: 104300 },
    { rank: 'LF23', min: 104800 },
    { rank: 'LF24', min: 104800 },
    { rank: 'LE', min: 105400 },
    { rank: 'LE1', min: 105900 },
    { rank: 'LE2', min: 106500 },
    { rank: 'LE3', min: 107000 },
    { rank: 'LE4', min: 107500 },
    { rank: 'LE5', min: 108100 },
    { rank: 'LE6', min: 108600 },
    { rank: 'LE7', min: 109200 },
    { rank: 'LE8', min: 109700 },
    { rank: 'LE9', min: 110200 },
    { rank: 'LE10', min: 110700 },
    { rank: 'LE11', min: 111300 },
    { rank: 'LE12', min: 111800 },
    { rank: 'LE13', min: 112300 },
    { rank: 'LE14', min: 112900 },
    { rank: 'LE15', min: 113400 },
    { rank: 'LE16', min: 113900 },
    { rank: 'LE17', min: 114400 },
    { rank: 'LE18', min: 115000 },
    { rank: 'LE19', min: 115500 },
    { rank: 'LE20', min: 116000 },
    { rank: 'LE21', min: 116500 },
    { rank: 'LE22', min: 117100 },
    { rank: 'LE23', min: 117600 },
    { rank: 'LE24', min: 118200 },
    { rank: 'LD', min: 118800 },
    { rank: 'LD1', min: 119300 },
    { rank: 'LD2', min: 119800 },
    { rank: 'LD3', min: 120400 },
    { rank: 'LD4', min: 120900 },
    { rank: 'LD5', min: 121400 },
    { rank: 'LD6', min: 122000 },
    { rank: 'LD7', min: 122500 },
    { rank: 'LD8', min: 123000 },
    { rank: 'LD9', min: 123600 },
    { rank: 'LD10', min: 124100 },
    { rank: 'LD11', min: 124600 },
    { rank: 'LD12', min: 125200 },
    { rank: 'LD13', min: 125700 },
    { rank: 'LD14', min: 126200 },
    { rank: 'LD15', min: 126700 },
    { rank: 'LD16', min: 127300 },
    { rank: 'LD17', min: 127800 },
    { rank: 'LD18', min: 128300 },
    { rank: 'LD19', min: 128900 },
    { rank: 'LD20', min: 129400 },
    { rank: 'LD21', min: 130000 },
    { rank: 'LD22', min: 130500 },
    { rank: 'LD23', min: 131100 },
    { rank: 'LD24', min: 132000 },
    { rank: 'LC', min: 132500 },
    { rank: 'LC1', min: 133000 },
    { rank: 'LC2', min: 133600 },
    { rank: 'LC3', min: 134100 },
    { rank: 'LC4', min: 134700 },
    { rank: 'LC5', min: 135200 },
    { rank: 'LC6', min: 135800 },
    { rank: 'LC7', min: 136300 },
    { rank: 'LC8', min: 136800 },
    { rank: 'LC9', min: 137400 },
    { rank: 'LC10', min: 137900 },
    { rank: 'LC11', min: 138500 },
    { rank: 'LC12', min: 139000 },
    { rank: 'LC13', min: 139600 },
    { rank: 'LC14', min: 140100 },
    { rank: 'LC15', min: 140700 },
    { rank: 'LC16', min: 141200 },
    { rank: 'LC17', min: 141800 },
    { rank: 'LC18', min: 142300 },
    { rank: 'LC19', min: 142900 },
    { rank: 'LC20', min: 143400 },
    { rank: 'LC21', min: 144000 },
    { rank: 'LC22', min: 144500 },
    { rank: 'LC23', min: 145100 },
    { rank: 'LC24', min: 146100 },
    { rank: 'LB', min: 146600 },
    { rank: 'LB1', min: 147100 },
    { rank: 'LB2', min: 147700 },
    { rank: 'LB3', min: 148200 },
    { rank: 'LB4', min: 148800 },
    { rank: 'LB5', min: 149300 },
    { rank: 'LB6', min: 149900 },
    { rank: 'LB7', min: 150400 },
    { rank: 'LB8', min: 151000 },
    { rank: 'LB9', min: 151500 },
    { rank: 'LB10', min: 152100 },
    { rank: 'LB11', min: 152600 },
    { rank: 'LB12', min: 153200 },
    { rank: 'LB13', min: 153700 },
    { rank: 'LB14', min: 154300 },
    { rank: 'LB15', min: 154800 },
    { rank: 'LB16', min: 155400 },
    { rank: 'LB17', min: 155900 },
    { rank: 'LB18', min: 156500 },
    { rank: 'LB19', min: 157000 },
    { rank: 'LB20', min: 157600 },
    { rank: 'LB21', min: 158100 },
    { rank: 'LB22', min: 158700 },
    { rank: 'LB23', min: 159200 },
    { rank: 'LB24', min: 160500 },
    { rank: 'LA', min: 161100 },
    { rank: 'LA1', min: 161600 },
    { rank: 'LA2', min: 162200 },
    { rank: 'LA3', min: 162700 },
    { rank: 'LA4', min: 163300 },
    { rank: 'LA5', min: 163800 },
    { rank: 'LA6', min: 164400 },
    { rank: 'LA7', min: 164900 },
    { rank: 'LA8', min: 165500 },
    { rank: 'LA9', min: 166000 },
    { rank: 'LA10', min: 166600 },
    { rank: 'LA11', min: 167100 },
    { rank: 'LA12', min: 167700 },
    { rank: 'LA13', min: 168200 },
    { rank: 'LA14', min: 168800 },
    { rank: 'LA15', min: 169300 },
    { rank: 'LA16', min: 169900 },
    { rank: 'LA17', min: 170400 },
    { rank: 'LA18', min: 171000 },
    { rank: 'LA19', min: 171500 },
    { rank: 'LA20', min: 172100 },
    { rank: 'LA21', min: 172600 },
    { rank: 'LA22', min: 173200 },
    { rank: 'LA23', min: 173700 },
    { rank: 'LA24', min: 175300 },
    { rank: 'LS', min: 175900 },
    { rank: 'LS1', min: 176500 },
    { rank: 'LS2', min: 177100 },
    { rank: 'LS3', min: 177700 },
    { rank: 'LS4', min: 178300 },
    { rank: 'LS5', min: 178900 },
    { rank: 'LS6', min: 179500 },
    { rank: 'LS7', min: 180100 },
    { rank: 'LS8', min: 180700 },
    { rank: 'LS9', min: 181300 },
    { rank: 'LS10', min: 181900 },
    { rank: 'LS11', min: 182500 },
    { rank: 'LS12', min: 183100 },
    { rank: 'LS13', min: 183700 },
    { rank: 'LS14', min: 184300 },
    { rank: 'LS15', min: 185000 },
    { rank: 'LS16', min: 185600 },
    { rank: 'LS17', min: 186200 },
    { rank: 'LS18', min: 186800 },
    { rank: 'LS19', min: 187400 },
    { rank: 'LS20', min: 188000 },
    { rank: 'LS21', min: 188600 },
    { rank: 'LS22', min: 189200 },
    { rank: 'LS23', min: 189800 },
    { rank: 'LS24', min: 190400 },
];

/**
 * Role groups mapping for aptitude conditions.
 */
export const ROLE_GROUP = Object.freeze({
    sprint: 'distance',
    mile: 'distance',
    medium: 'distance',
    long: 'distance',
    front: 'style',
    pace: 'style',
    late: 'style',
    end: 'style',
});

/**
 * Aptitude bucket multipliers for Server JP.
 */
export const BUCKET_MULTIPLIER = Object.freeze({
    good: 1.1,
    average: 0.9,
    bad: 0.8,
    terrible: 0.7,
    base: 1.0,
});

/**
 * Map aptitude grade (S, A, B, C, D, E, F, G) to rating bucket.
 * S / A => good (1.1x)
 * B / C => average (0.9x)
 * D / E / F => bad (0.8x)
 * G => terrible (0.7x)
 */
export function getBucketForGrade(grade) {
    switch ((grade || '').toUpperCase()) {
        case 'S':
        case 'A':
            return 'good';
        case 'B':
        case 'C':
            return 'average';
        case 'D':
        case 'E':
        case 'F':
            return 'bad';
        default:
            return 'terrible';
    }
}

/**
 * Calculate stat rating score for a single stat (0 to 3000).
 */
export function calculateStatRating(statValue) {
    const val = Math.max(0, Math.min(MAX_STAT_VALUE, parseInt(statValue, 10) || 0));
    return STAT_SCORES[val] || 0;
}

/**
 * Calculate total stat rating score for all 5 stats.
 */
export function calculateTotalStatsRating(stats = {}) {
    const sp = calculateStatRating(stats.speed);
    const st = calculateStatRating(stats.stamina);
    const po = calculateStatRating(stats.power);
    const gu = calculateStatRating(stats.guts);
    const wi = calculateStatRating(stats.wisdom ?? stats.wit);
    return sp + st + po + gu + wi;
}

/**
 * Calculate unique skill bonus based on star level (1-5) and unique skill level (1-6).
 * Star 1-2: 120 * Level (Max Lv 4)
 * Star 3-5: 170 * Level (Max Lv 6)
 */
export function calculateUniqueSkillRating(starLevel = 3, uniqueLevel = 3) {
    const star = parseInt(starLevel, 10) || 3;
    const maxLv = (star === 1 || star === 2) ? 4 : 6;
    const lvl = Math.max(0, Math.min(maxLv, parseInt(uniqueLevel, 10) || 0));
    if (!lvl) return 0;
    const multiplier = (star === 1 || star === 2) ? 120 : 170;
    return lvl * multiplier;
}

/**
 * Calculate effective rating score for a single skill based on race configuration.
 */
export function calculateSkillRating(skill, raceConfig = {}) {
    if (!skill) return 0;

    const rawType = (skill.type || '').toLowerCase();
    // Inherited Unique Skill has fixed 180 score
    if (rawType === 'ius') {
        return 180;
    }

    const baseScore = typeof skill.score === 'number'
        ? skill.score
        : (typeof skill.base_score === 'number' ? skill.base_score : 0);

    // Negative (purple) skills preserve negative rating without multiplier
    if (rawType === 'purple' || baseScore < 0) {
        return baseScore;
    }

    const checkTypeRaw = (skill.check_type || skill.checkType || '').trim().toLowerCase();
    // Turf / Dirt skills restrict race suitability, but do NOT scale rating points
    if (!checkTypeRaw || checkTypeRaw === 'turf' || checkTypeRaw === 'dirt') {
        return baseScore;
    }

    const getRoleMultiplier = (roleKey) => {
        if (!ROLE_GROUP[roleKey]) return null;
        const grade = raceConfig[roleKey];
        if (!grade) return null;
        const bucket = getBucketForGrade(grade);
        return BUCKET_MULTIPLIER[bucket] ?? 1.0;
    };

    // Compound aptitude conditions (e.g. "Sprint/Mile" or "Long/Pace")
    if (checkTypeRaw.includes('/')) {
        const roles = checkTypeRaw.split('/').map(r => r.trim().toLowerCase()).filter(Boolean);
        const groupMax = new Map();
        roles.forEach(roleKey => {
            const mult = getRoleMultiplier(roleKey);
            if (mult === null) return;
            const group = ROLE_GROUP[roleKey] || roleKey;
            const prev = groupMax.get(group);
            if (prev === undefined || mult > prev) groupMax.set(group, mult);
        });

        if (groupMax.size > 0) {
            let value = Math.fround(baseScore);
            groupMax.forEach(mult => {
                value = Math.fround(value * Math.fround(mult));
            });
            return Math.round(value);
        }
        return baseScore;
    }

    // Single aptitude role (e.g. "Front", "Medium")
    const roleMult = getRoleMultiplier(checkTypeRaw);
    if (roleMult !== null) {
        let value = Math.fround(baseScore);
        value = Math.fround(value * Math.fround(roleMult));
        return Math.round(value);
    }

    return baseScore;
}

/**
 * Calculate full projected rating breakdown.
 *
 * @param {Object} params
 * @param {Object} params.stats - { speed, stamina, power, guts, wisdom }
 * @param {number} params.starLevel - 1 to 5
 * @param {number} params.uniqueLevel - 1 to 6
 * @param {Array} params.selectedSkills - Array of skill objects
 * @param {Object} params.raceConfig - { turf, dirt, sprint, mile, medium, long, front, pace, late, end }
 * @returns {Object} Full breakdown with scores, currentRank, nextRank, nextThreshold, pointsToNext, progressPercent
 */
export function calculateProjectedRating({
    stats = {},
    starLevel = 3,
    uniqueLevel = 3,
    selectedSkills = [],
    raceConfig = {},
}) {
    const statsScore = calculateTotalStatsRating(stats);
    const uniqueScore = calculateUniqueSkillRating(starLevel, uniqueLevel);
    const skillsScore = (selectedSkills || []).reduce(
        (sum, s) => sum + calculateSkillRating(s, raceConfig),
        0
    );
    const totalScore = statsScore + uniqueScore + skillsScore;

    // Resolve rank from RANK_THRESHOLDS
    let currentRankIdx = 0;
    for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
        if (totalScore >= RANK_THRESHOLDS[i].min) {
            currentRankIdx = i;
        } else {
            break;
        }
    }

    const currentRankObj = RANK_THRESHOLDS[currentRankIdx];
    const nextRankObj = currentRankIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[currentRankIdx + 1] : null;

    const currentRank = currentRankObj.rank;
    const currentThreshold = currentRankObj.min;
    const nextRank = nextRankObj ? nextRankObj.rank : null;
    const nextThreshold = nextRankObj ? nextRankObj.min : Infinity;
    const pointsToNext = nextRankObj ? Math.max(0, nextThreshold - totalScore) : 0;

    const rangeSpan = nextRankObj ? (nextThreshold - currentThreshold) : 1;
    const progressPercent = nextRankObj
        ? Math.min(100, Math.max(0, ((totalScore - currentThreshold) / rangeSpan) * 100))
        : 100;

    return {
        statsScore,
        uniqueScore,
        skillsScore,
        totalScore,
        currentRank,
        currentThreshold,
        nextRank,
        nextThreshold,
        pointsToNext,
        progressPercent: Math.round(progressPercent * 10) / 10,
    };
}
