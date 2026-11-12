import assert from 'node:assert/strict';
import test from 'node:test';
import catalog from '../../resources/js/data/ratingSkillsCatalog.json' with { type: 'json' };
import { optimizeSkillBuild } from '../../resources/js/utils/skillOptimizerHelper.js';

const white = catalog.find(skill => skill.id === 204672);
const gold = catalog.find(skill => skill.id === 204671);

for (const isLocked of [false, true]) {
    test(`rejects a 320 Pt upgrade at 160 Pt (locked: ${isLocked})`, () => {
        const result = optimizeSkillBuild({ budgetPt: 160, candidates: [white, { ...gold, isLocked }] });

        assert.deepEqual(result.recommendedSkills.map(skill => skill.id), [white.id]);
        assert.equal(result.totalCostPt, 160);
        assert.equal(result.totalRatingGain, white.score);
        assert.equal(result.unselectedSkills.find(skill => skill.id === gold.id)?.reason, 'insufficient_budget');
        assert.equal(result.hasLockedUnaffordable, isLocked);
    });

    test(`buys White and Gold for 320 Pt and scores only Gold (locked: ${isLocked})`, () => {
        const result = optimizeSkillBuild({ budgetPt: 320, candidates: [white, { ...gold, isLocked }] });

        assert.deepEqual(result.recommendedSkills.map(skill => skill.id), [white.id, gold.id]);
        assert.equal(result.totalCostPt, 320);
        assert.equal(result.remainingPt, 0);
        assert.equal(result.totalRatingGain, gold.score);
    });
}

test('uses the catalog cost at Hint Lv. 0 when the prerequisite is absent', () => {
    const upgrade = catalog.find(skill => skill.id === 204691);
    const candidates = [{ ...upgrade, hintLevel: 1, isLocked: true }];

    const short = optimizeSkillBuild({ budgetPt: 341, candidates });
    const exact = optimizeSkillBuild({ budgetPt: 342, candidates });

    assert.deepEqual(short.recommendedSkills, []);
    assert.equal(short.unselectedSkills[0].reason, 'insufficient_budget');
    assert.equal(exact.recommendedSkills[0].id, upgrade.id);
    assert.equal(exact.totalCostPt, 342);
    assert.equal(exact.totalRatingGain, upgrade.score);
});

test('uses the candidate hint and subtracts the actual score of an owned prerequisite', () => {
    const upgrade = catalog.find(skill => skill.id === 204691);
    const prerequisite = catalog.find(skill => skill.id === upgrade.prereq_id);
    const candidates = [{ ...prerequisite, hintLevel: 2 }, upgrade];

    const hinted = optimizeSkillBuild({ budgetPt: 324, candidates });
    const owned = optimizeSkillBuild({
        budgetPt: 180,
        candidates,
        alreadyOwnedSkillIds: [String(prerequisite.id)],
        raceConfig: { medium: 'A' },
    });

    assert.equal(hinted.totalCostPt, 324);
    assert.equal(hinted.totalRatingGain, upgrade.score);
    assert.deepEqual(owned.recommendedSkills.map(skill => skill.id), [upgrade.id]);
    assert.equal(owned.totalCostPt, 180);
    assert.equal(owned.totalRatingGain, 559 - 239);
});

test('charges the entire evolution chain and selects only one upgrade branch', () => {
    const evolution = catalog.find(skill => skill.id === 114901211);
    const upgrade = catalog.find(skill => skill.id === evolution.prereq_id);
    const sibling = { ...evolution, id: -1, score: evolution.score - 10 };
    const candidates = [evolution, upgrade, sibling];

    const short = optimizeSkillBuild({ budgetPt: 539, candidates });
    const exact = optimizeSkillBuild({ budgetPt: 540, candidates });

    assert.deepEqual(short.recommendedSkills.map(skill => skill.id), [upgrade.id]);
    assert.deepEqual(exact.recommendedSkills.map(skill => skill.id), [upgrade.id, evolution.id]);
    assert.equal(exact.totalCostPt, 540);
    assert.equal(exact.totalRatingGain, evolution.score);
});

test('shares the prerequisite cost when both stages are locked', () => {
    const extra = { id: -1, base_cost: 30, score: 100 };
    const result = optimizeSkillBuild({
        budgetPt: 350,
        candidates: [{ ...white, isLocked: true }, { ...gold, isLocked: true }, extra],
    });

    assert.equal(result.totalCostPt, 350);
    assert.equal(result.totalRatingGain, gold.score + extra.score);
    assert.equal(result.hasLockedUnaffordable, false);
});

test('uses the catalog cost of a circle prerequisite with Fast Learner', () => {
    const candidates = [{ id: 200011, isLocked: true }];
    const short = optimizeSkillBuild({ budgetPt: 179, candidates, isFastLearner: true });
    const exact = optimizeSkillBuild({ budgetPt: 180, candidates, isFastLearner: true });

    assert.equal(short.unselectedSkills[0].reason, 'insufficient_budget');
    assert.deepEqual(exact.recommendedSkills.map(skill => skill.id), [200011]);
    assert.equal(exact.recommendedSkills[0].purchaseCost, 180);
    assert.equal(exact.totalCostPt, 180);
});

test('keeps an owned upgrade and does not recommend buying its lower stage', () => {
    const result = optimizeSkillBuild({
        budgetPt: 320,
        candidates: [white, gold],
        alreadyOwnedSkillIds: [gold.id],
    });

    assert.deepEqual(result.recommendedSkills, []);
    assert.equal(result.totalCostPt, 0);
    assert.equal(result.totalRatingGain, 0);
});
