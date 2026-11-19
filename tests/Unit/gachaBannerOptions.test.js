import assert from 'node:assert/strict';
import test from 'node:test';
import { groupGachaBannerOptions } from '../../resources/js/utils/gachaBannerOptions.js';

test('shows Daring Tact in the Character Premium group and filters Premium Support by type', () => {
    const daringTact = {
        id: 1,
        name: 'Premium Pretty Derby Gacha: Daring Tact',
        banner_type: 'character',
        category: 'premium',
        start_date: '2026-11-16',
        featured_items: ['Daring Tact'],
    };
    const premiumSupport = { id: 2, banner_type: 'support_card', category: 'premium', start_date: '2026-11-16', featured_items: ['SSR Support'] };
    const banners = [daringTact, premiumSupport];

    assert.deepEqual(groupGachaBannerOptions(banners, 'character').premium, [daringTact]);
    assert.deepEqual(groupGachaBannerOptions(banners, 'support_card').premium, [premiumSupport]);
});

test('preserves the existing banner groups and Scenario Release priority', () => {
    const anniversary = { banner_type: 'character', category: 'anniversary' };
    const scenarioRelease = { banner_type: 'character', category: 'scenario_release' };
    const octoberRelease = { banner_type: 'character', category: 'standard', start_date: '2026-10-26' };
    const twinkle = { banner_type: 'character', category: 'twinkle' };
    const selectPickup = { banner_type: 'support_card', category: 'select_rate_up' };
    const standard = { banner_type: 'character', category: 'standard' };
    const banners = [anniversary, scenarioRelease, octoberRelease, twinkle, selectPickup, standard];
    for (const banner of banners) banner.featured_items = ['Pickup'];

    assert.deepEqual(groupGachaBannerOptions(banners, 'character'), {
        anni: [anniversary, scenarioRelease, octoberRelease],
        premium: [],
        twinkle: [twinkle],
        selectUp: [],
        standard: [standard],
    });
    assert.deepEqual(groupGachaBannerOptions(banners, 'support_card').selectUp, [selectPickup]);
});

test('hides unresolved pickup banners and includes the same banner once it has a lineup', () => {
    const placeholder = {
        id: 14,
        gametora_id: 30434,
        banner_type: 'character',
        category: 'standard',
        name: 'Pretty Derby Gacha: Pickup Character',
        start_date: '2026-04-30',
        featured_items: [],
    };
    const supportPlaceholder = { banner_type: 'support_card', category: 'standard', name: 'Support Card Gacha: Pickup Support Card' };
    const banners = [placeholder, supportPlaceholder];

    assert.deepEqual(groupGachaBannerOptions(banners, 'character').standard, []);
    assert.deepEqual(groupGachaBannerOptions(banners, 'support_card').standard, []);
    const resolved = { ...placeholder, name: 'Pretty Derby Gacha: Special Week', featured_items: ['Special Week'] };
    assert.deepEqual(groupGachaBannerOptions([resolved], 'character').standard, [resolved]);
    assert.deepEqual(placeholder.featured_items, []);
});
