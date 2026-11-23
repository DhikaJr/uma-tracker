import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import {
    formatDateTime, formatDuration, getOverallHealthMeta, getRunMetadataItems, getRunStatusMeta,
    getSourceLabel, getSourceStatusMeta, getTriggerLabel,
} from '../../resources/js/utils/dataHealth.js';

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

const startedAt = '2026-11-23T12:00:00+00:00';
const finishedAt = '2026-11-23T12:00:03+00:00';
const viewModule = '/resources/js/components/DataHealthView.jsx';
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));

test('overall, source and unfinished run statuses have distinct localized labels', () => {
    assert.deepEqual(['healthy', 'degraded', 'failed', 'unknown', 'other'].map(status => getOverallHealthMeta(status).label),
        ['Sehat', 'Perlu Perhatian', 'Bermasalah', 'Belum Diketahui', 'Belum Diketahui']);
    assert.deepEqual(['success', 'degraded', 'failed', 'unknown'].map(status => getSourceStatusMeta(status).label),
        ['Sehat', 'Terganggu Sebagian', 'Gagal', 'Belum Diketahui']);
    assert.equal(getRunStatusMeta(null, false).label, 'Sedang Berjalan');
    assert.equal(getSourceLabel('otherSource'), 'OtherSource');
    assert.equal(getTriggerLabel('embedded'), 'Bagian dari sinkronisasi induk');
    assert.equal(getTriggerLabel('other'), 'Tidak diketahui');
});

test('date and duration helpers format valid timestamps and handle invalid input', () => {
    assert.notEqual(formatDateTime(startedAt), '—');
    assert.equal(formatDateTime(null), '—');
    assert.equal(formatDateTime('not-a-date'), '—');
    assert.equal(formatDuration(startedAt, '2026-11-23T12:00:00.340Z'), '340 ms');
    assert.equal(formatDuration(startedAt, '2026-11-23T12:00:01Z'), '1 dtk');
    assert.equal(formatDuration(startedAt, '2026-11-23T12:01:05Z'), '1 m 5 dtk');
    assert.equal(formatDuration(startedAt, null), '—');
    assert.equal(formatDuration('invalid', finishedAt), '—');
    assert.equal(formatDuration(finishedAt, startedAt), '—');
});

test('the client refresh timestamp includes seconds while telemetry timestamps omit them', () => {
    const refreshedAt = '2026-11-24T05:26:43Z';

    assert.match(formatDateTime(refreshedAt, { includeSeconds: true }), /\b\d{1,2}\.\d{2}\.43$/);
    assert.match(formatDateTime(refreshedAt), /, \d{1,2}\.\d{2}$/);
});

test('metadata helper emits only labeled diagnostics', () => {
    assert.deepEqual(getRunMetadataItems({ mode: 'cached', is_up_to_date: true, lineups_found: 0, secret: 'hidden' }), [
        { label: 'Mode', value: 'Cached' },
        { label: 'Manifest terbaru' },
        { label: 'Lineup ditemukan', value: 0 },
    ]);
    assert.deepEqual(getRunMetadataItems(null), []);
});

test('overview displays healthy source cards and a visible zero-issue state', async () => {
    const { HealthOverview } = await vite.ssrLoadModule(viewModule);
    const html = render(HealthOverview, { health: {
        overall_status: 'healthy',
        sources: {
            gametora: { status: 'success', last_run_id: 1, last_finished_at: finishedAt, last_success_at: finishedAt },
            cygames: { status: 'success', last_error: '<script>historical error</script>' },
            umapyoi: { status: 'unknown' },
        },
        issues: { unresolved_select_pickup_count: 0, unresolved_select_pickup_ids: [] },
    } });
    for (const label of ['Sehat', 'GameTora', 'Cygames', 'Umapyoi', 'Run #1', 'Sinkronisasi sukses terakhir', 'Error terakhir', 'Tidak ada banner Select Pick Up tanpa kandidat']) {
        assert.ok(html.includes(label), label);
    }
    assert.match(html, /&lt;script&gt;historical error&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script/);
});

test('overview displays unresolved IDs and preserves distinct source status or missing fields', async () => {
    const { HealthOverview } = await vite.ssrLoadModule(viewModule);
    const html = render(HealthOverview, { health: {
        overall_status: 'degraded',
        sources: { gametora: { status: 'success' } },
        issues: { unresolved_select_pickup_count: 1, unresolved_select_pickup_ids: [30485] },
    } });
    assert.match(html, /Perlu Perhatian/);
    assert.match(html, /GameTora #30485/);
    assert.match(html, /Sehat/);
    assert.doesNotMatch(html, />Gagal</);

    const legacy = render(HealthOverview, { health: {
        overall_status: 'unexpected',
        sources: { gametora: { status: 'unknown', legacy_last_synced_at: finishedAt } },
    } });
    assert.match(legacy, /Belum Diketahui/);
    assert.match(legacy, /Sync legacy terakhir/);
    assert.match(legacy, /Belum pernah tercatat/);
    assert.match(legacy, /Hasil pemeriksaan belum tersedia/);
});

test('timeline keeps each child nested once and formats run metadata as labeled chips', async () => {
    const { SyncRunTimeline } = await vite.ssrLoadModule(viewModule);
    const html = render(SyncRunTimeline, { runs: [{
        id: 1, source: 'gametora', trigger: 'manual', status: 'degraded', is_finished: true,
        started_at: startedAt, finished_at: finishedAt, warning_count: 1, unresolved_count: 0, updated_count: null,
        metadata: { mode: 'full', characters_processed: 271, unknown_secret: 'hidden' },
        children: [
            { id: 2, source: 'umapyoi', status: 'success', is_finished: true, metadata: { lineups_found: 1 }, children: [{ id: 4, source: 'grandchild' }] },
            { id: 3, source: 'cygames', status: 'degraded', is_finished: true, error_summary: 'Koneksi gagal' },
        ],
    }] });
    assert.match(html, /GameTora[\s\S]*Terganggu Sebagian[\s\S]*aria-label="Run turunan"[\s\S]*Umapyoi[\s\S]*Sehat[\s\S]*Cygames[\s\S]*Terganggu Sebagian/);
    assert.equal((html.match(/>Umapyoi</g) ?? []).length, 1);
    assert.equal((html.match(/>Cygames</g) ?? []).length, 1);
    for (const label of ['Mode: Full', 'Karakter diproses: 271', 'Lineup ditemukan: 1', 'Ringkasan error', 'Durasi 3 dtk', 'Peringatan: 1']) {
        assert.ok(html.includes(label), label);
    }
    assert.doesNotMatch(html, /grandchild|unknown_secret|characters_processed|mode&quot;|Belum terselesaikan:|Diperbarui:/);
});

test('unfinished runs have a running label and no fabricated duration', async () => {
    const { SyncRunTimeline } = await vite.ssrLoadModule(viewModule);
    const html = render(SyncRunTimeline, {
        runs: [{ id: 1, source: 'gametora', status: null, is_finished: false, started_at: startedAt, finished_at: null }],
    });
    assert.match(html, /Sedang Berjalan/);
    assert.match(html, /Durasi —/);
    assert.doesNotMatch(html, />Gagal</);
});

test('empty history explains that new telemetry requires a sync after Data Health is active', async () => {
    const { SyncRunTimeline } = await vite.ssrLoadModule(viewModule);
    const html = render(SyncRunTimeline, { runs: [] });

    assert.match(html, /Belum ada riwayat sinkronisasi\./);
    assert.match(html, /Riwayat akan muncul setelah sinkronisasi GameTora, Cygames, atau Umapyoi dijalankan setelah telemetry Data Health aktif\./);
    assert.doesNotMatch(html, /Muat Ulang/);
});

test('the page starts with separate loading states and only offers a GET refresh', async () => {
    const { default: DataHealthView } = await vite.ssrLoadModule(viewModule);
    const html = render(DataHealthView);
    assert.match(html, />Data Health</);
    assert.match(html, /Memuat Data Health/);
    assert.match(html, /Memuat riwayat sinkronisasi/);
    assert.doesNotMatch(html, /Belum Diketahui|Force Sync|Perbaiki|Retry Cygames|Sinkronkan Sekarang/);
    const refreshButton = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
    assert.match(refreshButton, /disabled=""/);
    assert.match(refreshButton, /title="Membaca ulang status dan riwayat yang sudah tercatat\. Tidak menjalankan sinkronisasi baru\."/);
    assert.match(refreshButton, /animate-spin[\s\S]*Memuat\.\.\.<\/button>/);
    assert.doesNotMatch(html, /Data diperbarui/);
    const source = await readFile(new URL('../../resources/js/components/DataHealthView.jsx', import.meta.url), 'utf8');
    assert.deepEqual([...source.matchAll(/loadSection\('(\/api\/[^']+)'/g)].map(([, url]) => url),
        ['/api/data-health', '/api/data-health/sync-runs?limit=20']);
    assert.match(source, /fetch\(url, \{ cache: 'no-store', signal \}\)/);
    assert.match(source, /controller\.abort\(\)/);
    assert.doesNotMatch(source, /setInterval|localStorage|sessionStorage|\bPOST\b|\/api\/gacha\/sync/);
});

test('Health is the active Navbar item after Event and bottom navigation keeps its seven items', async () => {
    const { default: Navbar } = await vite.ssrLoadModule('/resources/js/components/Navbar.jsx');
    const { default: MobileBottomNav } = await vite.ssrLoadModule('/resources/js/components/MobileBottomNav.jsx');
    const navbar = render(Navbar, { activeTab: 'health' });
    assert.match(navbar, />Event<[\s\S]*title="Kesehatan Data &amp; Riwayat Sinkronisasi" aria-current="page"[\s\S]*>Health</);
    const quotaClasses = navbar.match(/<div\b(?=[^>]*title="Kuota Circle)[^>]*class="([^"]+)"/)?.[1].split(/\s+/) ?? [];
    assert.ok(quotaClasses.includes('hidden'));
    assert.ok(quotaClasses.includes('2xl:flex'));
    assert.ok(!quotaClasses.includes('xl:flex'));

    const bottom = render(MobileBottomNav, { activeTab: 'health' });
    const buttons = [...bottom.matchAll(/<button\b[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span><\/button>/g)];
    assert.deepEqual(buttons.map(([, label]) => label),
        ['Dasbor', 'Afinitas', 'Karier', 'Gacha', 'Koleksi', 'Circle', 'Perencana']);
    assert.doesNotMatch(bottom, /Health/);
});
