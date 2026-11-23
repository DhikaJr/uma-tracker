const unknownStatus = { label: 'Belum Diketahui', tone: 'unknown' };
const healthyStatus = { label: 'Sehat', tone: 'healthy' };

const overallStatuses = {
    healthy: { ...healthyStatus, description: 'Data tersinkronisasi dan tidak ada masalah aktif yang terdeteksi.' },
    degraded: { label: 'Perlu Perhatian', tone: 'degraded', description: 'Data masih dapat digunakan, tetapi ada sumber atau item yang memerlukan perhatian.' },
    failed: { label: 'Bermasalah', tone: 'failed', description: 'Sinkronisasi terakhir mengalami kegagalan. Data terakhir yang tersimpan mungkin masih tersedia.' },
    unknown: { ...unknownStatus, description: 'Riwayat sinkronisasi belum cukup untuk menentukan kondisi data.' },
};

const sourceStatuses = {
    success: healthyStatus,
    degraded: { label: 'Terganggu Sebagian', tone: 'degraded' },
    failed: { label: 'Gagal', tone: 'failed' },
    unknown: unknownStatus,
};
const runningStatus = { label: 'Sedang Berjalan', tone: 'running' };

export const HEALTH_SOURCES = {
    gametora: 'GameTora',
    cygames: 'Cygames',
    umapyoi: 'Umapyoi',
};

export const RECOVERY_ACTIONS = {
    gametora: {
        url: '/api/gacha/sync-gametora',
        payload: { force: false, allow_evolution_removals: false },
        label: 'Sinkronkan GameTora',
        pendingLabel: 'Menyinkronkan GameTora...',
        description: 'Menjalankan sinkronisasi normal GameTora dengan mode force dan penghapusan evolusi dinonaktifkan.',
    },
    cygames: {
        url: '/api/data-health/actions/recheck-cygames',
        label: 'Periksa ulang Cygames',
        pendingLabel: 'Memeriksa Cygames...',
        description: 'Memeriksa ulang pengumuman resmi Select Pick Up dan memulihkan lineup hanya jika kandidat resmi dapat diverifikasi.',
    },
    umapyoi: {
        url: '/api/data-health/actions/recheck-umapyoi',
        label: 'Periksa ulang Umapyoi',
        pendingLabel: 'Memeriksa Umapyoi...',
        description: 'Menguji ulang sumber Twinkle Collection dan memperbarui telemetri sumber tanpa menulis ulang banner.',
    },
};

export function getUnresolvedCount(health) {
    const issues = health?.issues;
    return issues?.unresolved_select_pickup_count
        ?? (Array.isArray(issues?.unresolved_select_pickup_ids) ? issues.unresolved_select_pickup_ids.length : null);
}

export function getRecoveryActions(health) {
    if (!health) return [];

    const sources = health.sources;
    const hasProblem = source => ['degraded', 'failed'].includes(sources?.[source]?.status);
    const actions = [];
    if (health.overall_status !== 'healthy' || ['failed', 'unknown'].includes(sources?.gametora?.status ?? 'unknown')) actions.push('gametora');
    if (hasProblem('cygames') || getUnresolvedCount(health) > 0) actions.push('cygames');
    if (hasProblem('umapyoi')) actions.push('umapyoi');
    return actions;
}

export function getRecoveryResult(source, result, previousHealth, latestHealth) {
    if (source === 'gametora') {
        if (result) return { tone: 'healthy', message: 'Sinkronisasi GameTora selesai.' };

        const latest = latestHealth?.sources?.gametora;
        const failureRecorded = latest?.status === 'failed' && latest.last_run_id != null
            && latest.last_run_id !== previousHealth?.sources?.gametora?.last_run_id;
        return {
            tone: 'failed',
            message: failureRecorded
                ? 'Sinkronisasi GameTora gagal. Status terbaru telah dicatat.'
                : 'Sinkronisasi GameTora gagal.',
        };
    }

    if (!result) return { tone: 'failed', message: 'Tindakan pemulihan tidak dapat dijalankan.' };

    const sourceLabel = getSourceLabel(source);
    const status = result.source_status;
    if (source === 'cygames' && getUnresolvedCount(latestHealth) > 0) {
        return { tone: 'degraded', message: 'Cygames sudah diperiksa ulang, tetapi masih ada Select Pick Up yang belum dapat diverifikasi.' };
    }
    if (status === 'failed') {
        return { tone: 'degraded', message: 'Pemeriksaan ' + sourceLabel + ' selesai, tetapi sumber masih mengalami kegagalan.' };
    }
    if (status === 'degraded') {
        return { tone: 'degraded', message: 'Pemeriksaan ' + sourceLabel + ' selesai, tetapi sumber masih mengalami gangguan.' };
    }
    if (status !== 'success') {
        return { tone: 'degraded', message: 'Pemeriksaan ' + sourceLabel + ' selesai. Status terbaru belum dapat dikonfirmasi.' };
    }
    if (source === 'cygames' && getUnresolvedCount(previousHealth) > 0 && getUnresolvedCount(latestHealth) === 0) {
        return { tone: 'healthy', message: 'Lineup Select Pick Up berhasil dipulihkan.' };
    }
    return { tone: 'healthy', message: sourceLabel + ' berhasil diperiksa ulang dan status terbaru sudah tercatat.' };
}

const triggerLabels = {
    manual: 'Manual',
    embedded: 'Bagian dari sinkronisasi induk',
    direct: 'Langsung',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const refreshTimeFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' });
const durationFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export function getOverallHealthMeta(status) {
    return Object.hasOwn(overallStatuses, status) ? overallStatuses[status] : overallStatuses.unknown;
}

export function getSourceStatusMeta(status) {
    return Object.hasOwn(sourceStatuses, status) ? sourceStatuses[status] : unknownStatus;
}

export function getRunStatusMeta(status, isFinished) {
    return isFinished === false ? runningStatus : getSourceStatusMeta(status);
}

export function getSourceLabel(source) {
    const value = typeof source === 'string' ? source.trim() : '';
    const key = value.toLowerCase();
    if (Object.hasOwn(HEALTH_SOURCES, key)) return HEALTH_SOURCES[key];
    return value ? value[0].toUpperCase() + value.slice(1) : 'Sumber tidak diketahui';
}

export function getTriggerLabel(trigger) {
    return Object.hasOwn(triggerLabels, trigger) ? triggerLabels[trigger] : 'Tidak diketahui';
}

export function formatDateTime(value, { includeSeconds = false } = {}) {
    if (typeof value !== 'string') return '—';
    const milliseconds = Date.parse(value);
    const formatter = includeSeconds ? refreshTimeFormatter : dateFormatter;
    return Number.isFinite(milliseconds) ? formatter.format(milliseconds) : '—';
}

export function formatDuration(startedAt, finishedAt) {
    if (typeof startedAt !== 'string' || typeof finishedAt !== 'string') return '—';
    const milliseconds = Date.parse(finishedAt) - Date.parse(startedAt);
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—';
    if (milliseconds < 1000) return `${milliseconds} ms`;
    const seconds = milliseconds / 1000;
    if (seconds < 60) return `${durationFormatter.format(seconds)} dtk`;

    const roundedSeconds = Math.round(seconds);
    return `${Math.floor(roundedSeconds / 60)} m ${roundedSeconds % 60} dtk`;
}

const metadataLabels = {
    characters_processed: 'Karakter diproses',
    support_cards_processed: 'Support card diproses',
    banners_processed: 'Banner diproses',
    articles_processed: 'Artikel diproses',
    official_banners_updated: 'Banner resmi diperbarui',
    lineups_found: 'Lineup ditemukan',
    detail_requests: 'Permintaan detail',
    detail_failures: 'Detail gagal',
    detail_fetch_failures: 'Detail gagal diambil',
    parse_failures: 'Artikel gagal dibaca',
    resolution_failures: 'Kandidat gagal dicocokkan',
};

export function getRunMetadataItems(metadata) {
    const items = [];
    if (metadata?.mode === 'full' || metadata?.mode === 'cached') {
        items.push({ label: 'Mode', value: metadata.mode === 'full' ? 'Full' : 'Cached' });
    }
    if (metadata?.is_up_to_date === true) items.push({ label: 'Manifest terbaru' });
    if (metadata?.index_fetch_ok === false) items.push({ label: 'Indeks tidak tersedia' });
    if (metadata?.search_request_ok === false) items.push({ label: 'Pencarian tidak tersedia' });

    for (const [key, label] of Object.entries(metadataLabels)) {
        const value = metadata?.[key];
        if (Number.isInteger(value) && value >= 0) items.push({ label, value });
    }
    return items;
}
