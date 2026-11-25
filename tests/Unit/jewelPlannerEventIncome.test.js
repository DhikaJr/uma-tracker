import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { calculateEventIncome } from '../../resources/js/utils/jewelPlannerEventIncome.js';

const futureTarget = { diffDays: 60, monthsCount: 2 };
const eventSettings = {
    story_events_count: 1,
    legend_races_count: 2,
    g1_bonus_enabled: true,
    pakalive_streams_count: 1,
    campaign_bonus_carats: 1500,
    unexpected_bonus_carats: 300,
    unexpected_bonus_note: 'Kompensasi + hadiah anime',
};

test('event income projects 5,250 Carat with each manual bonus counted once', () => {
    assert.deepEqual(calculateEventIncome(eventSettings, futureTarget), {
        storyCarats: 2250, legendCarats: 300, g1Carats: 600, pakaliveCarats: 300,
        campaignCarats: 1500, unexpectedCarats: 300, totalEventCarats: 5250,
    });
});

test('empty settings and non-future targets contribute zero', () => {
    assert.equal(calculateEventIncome({}, futureTarget).totalEventCarats, 0);
    for (const diffDays of [0, -1]) {
        assert.deepEqual(calculateEventIncome(eventSettings, { diffDays, monthsCount: 2 }), {
            storyCarats: 0, legendCarats: 0, g1Carats: 0, pakaliveCarats: 0,
            campaignCarats: 0, unexpectedCarats: 0, totalEventCarats: 0,
        });
    }
});

test('invalid totals are zero and valid integer strings contribute numerically', () => {
    const invalid = {
        story_events_count: -2, legend_races_count: 'NaN', g1_bonus_enabled: true,
        pakalive_streams_count: 2, pakalive_carats_per_stream: '', campaign_bonus_carats: null, unexpected_bonus_carats: -250,
    };
    assert.equal(calculateEventIncome(invalid, { diffDays: 60, monthsCount: NaN }).totalEventCarats, 0);
    assert.equal(calculateEventIncome({ campaign_bonus_carats: '1500', unexpected_bonus_carats: '300' }, futureTarget).totalEventCarats, 1800);
});

test('PakaLive estimate can be overridden or zeroed and legacy counts use the default', () => {
    for (const [estimate, expected] of [[500, 1000], [0, 0], [undefined, 600]]) {
        const income = calculateEventIncome({ pakalive_streams_count: 2, pakalive_carats_per_stream: estimate }, futureTarget);
        assert.equal(income.pakaliveCarats, expected);
    }
});

test('event controls render six sources, capped manual inputs, and localized previews', async () => {
    const vite = await createServer({ configFile: false, appType: 'custom', server: { middlewareMode: true, watch: null, ws: false } });
    try {
        const { EventIncomeFields } = await vite.ssrLoadModule('/resources/js/components/JewelPlannerView.jsx');
        const calculation = { ...futureTarget, ...calculateEventIncome(eventSettings, futureTarget) };
        const html = renderToStaticMarkup(createElement(EventIncomeFields, { config: eventSettings, calculation }));

        for (const copy of [
            'Story Event', 'Legend Race — Lawan Baru', 'PakaLive TV Gift', 'G1 Support Missions',
            'Campaign / Anniversary Bonus', 'Bonus / Hadiah Tak Terduga', '1 × 2.250 = 2.250 Carat',
            '2 lawan × 150 = 300 Carat', '1 × 300 = 300 Carat', 'Estimasi target +600 Carat', 'satu kategori saja',
        ]) {
            assert.ok(html.includes(copy), copy);
        }
        assert.equal((html.match(/step="50"/g) ?? []).length, 2);
        assert.match(html, /maxLength="120"/i);
    } finally {
        await vite.close();
    }
});
