import assert from 'node:assert/strict';
import test from 'node:test';
import {
    calculateCaratDeficit,
    calculateDailyJewelPack,
    calculateFarmingImpact,
    calculateProjectionPeriod,
    calculateRoutineRewards,
    calculateTargetReadiness,
    getBannerTickets,
} from '../../resources/js/utils/jewelPlannerHelper.js';

test('Class 5 earns 600 Carat for four weeks and login earns 110 Carat per seven days', () => {
    const config = { stadium_class: 5, f2p_login_bonus: true, f2p_training_pass: false };
    const week = calculateRoutineRewards(config, 7, 1, 1);
    const fourWeeks = calculateRoutineRewards(config, 28, 4, 1);

    assert.equal(week.stadiumCarats, 150);
    assert.equal(week.loginBonus, 110);
    assert.equal(fourWeeks.stadiumCarats, 600);
    assert.equal(fourWeeks.loginBonus, 440);
});

for (const [bannerType, expectedTickets] of [['character', 2], ['support', 2], ['all', 4]]) {
    test(`Standard Training Pass counts only applicable tickets for ${bannerType} banners`, () => {
        const config = { f2p_training_pass: true, target_banner_type: bannerType };
        const enabled = calculateRoutineRewards(config, 30, 4, 1);
        const disabled = calculateRoutineRewards({ ...config, f2p_training_pass: false }, 30, 4, 1);

        assert.equal(enabled.f2pPassCarats, 500);
        assert.equal(enabled.f2pPassTickets, expectedTickets);
        assert.equal(disabled.f2pPassTickets, 0);
    });
}

test('monthly payouts exclude the starting date and include the first day of the target month', () => {
    assert.deepEqual(calculateProjectionPeriod('2026-11-01', '2026-11-30'), {
        diffDays: 29, diffWeeks: 4, monthTransitions: 0, monthsCount: 1,
    });
    assert.equal(calculateProjectionPeriod('2026-11-30', '2026-12-01').monthTransitions, 1);
    assert.equal(calculateProjectionPeriod('2026-11-30', '2027-01-01').monthTransitions, 2);
    assert.equal(calculateProjectionPeriod('2026-11-30', '2026-11-29').monthTransitions, 0);
});

for (const { target, days, estimatedMonths, paid, free } of [
    { target: '2026-11-01', days: 0, estimatedMonths: 0, paid: 0, free: 0 },
    { target: '2026-11-02', days: 1, estimatedMonths: 0, paid: 500, free: 50 },
    { target: '2026-12-01', days: 30, estimatedMonths: 1, paid: 500, free: 1500 },
    { target: '2026-12-02', days: 31, estimatedMonths: 1, paid: 1000, free: 1550 },
]) {
    test(`paid packs and monthly estimates respect a ${days}-day horizon`, () => {
        const { diffDays, diffWeeks, monthsCount } = calculateProjectionPeriod('2026-11-01', target);
        const rewards = calculateRoutineRewards({ f2p_training_pass: true }, diffDays, diffWeeks, monthsCount);

        assert.equal(diffDays, days);
        assert.equal(monthsCount, estimatedMonths);
        assert.equal(rewards.f2pPassCarats, estimatedMonths * 500);
        assert.equal(rewards.f2pPassTickets, estimatedMonths * 2);
        assert.deepEqual(calculateDailyJewelPack(diffDays, true), {
            dailyPackPaid: paid, dailyPackFree: free, dailyPackCarats: paid + free,
        });
    });
}

test('the exact Carat deficit uses only tickets eligible for the selected banner', () => {
    const currentCharacterTickets = getBannerTickets('character', 0, 2);
    const projectedSupportTickets = getBannerTickets('support', 5, 0);

    assert.equal(calculateCaratDeficit(200, 29999, currentCharacterTickets), 1);
    assert.equal(calculateCaratDeficit(200, 29999, projectedSupportTickets), 1);
    assert.equal(calculateCaratDeficit(200, 29849, getBannerTickets('support', 5, 1)), 1);
    assert.equal(calculateCaratDeficit(200, 0, 201), 0);
});

test('a 4,900 Carat farming cost removes 33 current pulls and 32 projected pulls', () => {
    const current = calculateFarmingImpact(140000, 20, 4900);
    const projected = calculateFarmingImpact(148798, 27, 4900);

    assert.deepEqual(current, { remainingCarats: 135100, pulls: 953, netPulls: 920, pullsLost: 33 });
    assert.deepEqual(projected, { remainingCarats: 143898, pulls: 1018, netPulls: 986, pullsLost: 32 });
});

test('farming cannot spend tickets or leave a negative Carat balance', () => {
    assert.deepEqual(calculateFarmingImpact(299, 2, 4900), {
        remainingCarats: 0, pulls: 3, netPulls: 2, pullsLost: 1,
    });
});

test('readiness preserves percentages over 200 and credits current holdings first', () => {
    assert.deepEqual(calculateTargetReadiness(953, 1018, 400, true), { percent: 254.5, status: 'current' });
    assert.deepEqual(calculateTargetReadiness(80, 120, 100, true), { percent: 120, status: 'projected' });
    assert.deepEqual(calculateTargetReadiness(80, 120, 100, false), { percent: 80, status: 'unmet' });
});
