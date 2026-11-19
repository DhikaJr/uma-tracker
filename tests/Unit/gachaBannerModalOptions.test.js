import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const banners = [
    { id: 14, gametora_id: 30434, banner_type: 'character', category: 'standard', name: 'Pretty Derby Gacha: Pickup Character', featured_items: [] },
    { id: 15, banner_type: 'character', category: 'premium', name: 'Daring Tact Premium', featured_items: ['Daring Tact [Regalia]'] },
    { id: 16, banner_type: 'character', category: 'standard', name: 'Standard Pickup', featured_items: ['Special Week'] },
];

let vite;
before(async () => {
    vite = await createServer({
        configFile: false,
        appType: 'custom',
        server: { middlewareMode: true, watch: null, ws: false },
    });
});
after(async () => {
    await vite?.close();
});

for (const [name, props] of [
    ['Quick10PullModal', {}],
    ['BulkEditGachaPullModal', { selectedIds: [1] }],
    ['EditGachaPullModal', { pull: { id: 1, banner_type: 'character', gacha_banner_id: 14 } }],
]) {
    test(`${name} offers only eligible banner targets`, async () => {
        const { default: Modal } = await vite.ssrLoadModule(`/resources/js/components/${name}.jsx`);
        const html = renderToStaticMarkup(createElement(Modal, { isOpen: true, banners, ...props }));
        const options = [...html.matchAll(/<option\b[^>]*>[^<]*<\/option>/g)].map(([option]) => option).join('\n');

        assert.doesNotMatch(options, /<option\b[^>]*value="14"/);
        assert.match(options, /<option\b[^>]*value="15"[^>]*>[^<]*Daring Tact Premium/);
        assert.match(options, /<option\b[^>]*value="16"[^>]*>[^<]*Standard Pickup/);
        if (name === 'Quick10PullModal') {
            assert.match(options, /<option\b[^>]*value="15"[^>]*selected=/);
        }
        assert.equal(banners[0].gametora_id, 30434);
    });
}

test('manual-UP buttons display only the selected Select Pick Up banner candidates', async () => {
    const { FeaturedRateUpButtons } = await vite.ssrLoadModule('/resources/js/components/GachaView.jsx');
    const { getSelectedGachaBanner } = await vite.ssrLoadModule('/resources/js/utils/gachaBannerOptions.js');
    const selectorBanners = [
        { id: 83, gametora_id: 30477, banner_type: 'support_card', name: 'Select Pick Up', category: 'select_rate_up', featured_items: ['SSR [気まぐれ渡り星] Stay Gold (Guts)'] },
        { id: 99, gametora_id: 30485, banner_type: 'support_card', name: 'Select Pick Up', category: 'select_rate_up', featured_items: ['SSR [巻頭カラーの夏] Kiseki (Stamina)', 'SSR [両手いっぱい、小倉愛] Nice Nature (Intelligence)'] },
    ];

    for (const [selected, other] of [selectorBanners, [...selectorBanners].reverse()]) {
        const banner = getSelectedGachaBanner(selectorBanners, String(selected.id), 'support_card');
        const html = renderToStaticMarkup(createElement(FeaturedRateUpButtons, { banner }));
        const candidateLabels = [...html.matchAll(/<button\b[^>]*><span>\+<\/span> (.*?)<\/button>/g)].map(([, label]) => label);
        assert.deepEqual(candidateLabels, selected.featured_items);
        for (const candidate of other.featured_items) {
            assert.ok(!html.includes(candidate));
        }
    }
});
