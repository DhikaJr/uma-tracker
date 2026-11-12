const CARATS_PER_PULL = 150;
const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

export const STADIUM_RETENTION_CARATS = Object.freeze({
    6: 250,
    5: 150,
    4: 150,
    3: 100,
    2: 70,
    1: 50,
    0: 0,
});

export function getPlannerDate(daysFromToday = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function calculateProjectionPeriod(startDate, targetDate) {
    const start = new Date(`${startDate}T00:00:00Z`);
    const target = new Date(`${targetDate}T00:00:00Z`);
    const diffDays = Math.max(0, (target - start) / MILLISECONDS_PER_DAY) || 0;
    const monthTransitions = diffDays > 0
        ? (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + target.getUTCMonth() - start.getUTCMonth()
        : 0;

    return { diffDays, diffWeeks: Math.floor(diffDays / DAYS_PER_WEEK), monthTransitions };
}

export function getBannerTickets(bannerType, characterTickets, supportTickets) {
    if (bannerType === 'character') return characterTickets;
    if (bannerType === 'support') return supportTickets;

    return characterTickets + supportTickets;
}

export function calculateRoutineRewards(config, days, weeks, estimatedMonths) {
    const passCount = config.f2p_training_pass !== false ? estimatedMonths : 0;
    const ticketsPerType = passCount * 2;

    return {
        dailyMissions: config.f2p_daily_missions ? days * 50 : 0,
        loginBonus: config.f2p_login_bonus ? Math.floor((days * 110) / DAYS_PER_WEEK) : 0,
        stadiumCarats: (STADIUM_RETENTION_CARATS[config.stadium_class] ?? STADIUM_RETENTION_CARATS[6]) * weeks,
        f2pPassCarats: passCount * 500,
        f2pPassTickets: getBannerTickets(config.target_banner_type || 'character', ticketsPerType, ticketsPerType),
    };
}

export function getPullCapacity(carats, tickets = 0) {
    return Math.floor(carats / CARATS_PER_PULL) + tickets;
}

export function calculateFarmingImpact(carats, tickets, farmingCost) {
    const remainingCarats = Math.max(0, carats - farmingCost);
    const pulls = getPullCapacity(carats, tickets);
    const netPulls = getPullCapacity(remainingCarats, tickets);

    return { remainingCarats, pulls, netPulls, pullsLost: pulls - netPulls };
}

export function calculateTargetReadiness(currentPulls, projectedPulls, targetPulls, includePredictions) {
    const activePulls = includePredictions ? projectedPulls : currentPulls;
    const percent = (activePulls / targetPulls) * 100;
    const status = currentPulls >= targetPulls ? 'current' : activePulls >= targetPulls ? 'projected' : 'unmet';

    return { percent, status };
}
