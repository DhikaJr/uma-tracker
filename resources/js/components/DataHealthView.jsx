import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, CircleHelp, Clock, History, LoaderCircle, RefreshCw } from 'lucide-react';
import {
    HEALTH_SOURCES, formatDateTime, formatDuration, getOverallHealthMeta, getRunMetadataItems,
    getRunStatusMeta, getSourceLabel, getSourceStatusMeta, getTriggerLabel,
} from '../utils/dataHealth';

const surfaces = 'rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900';
const muted = 'text-slate-600 dark:text-slate-400';
const title = 'font-bold text-slate-900 dark:text-slate-100';

const tones = {
    healthy: { icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
    degraded: { icon: AlertTriangle, classes: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
    failed: { icon: AlertCircle, classes: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300' },
    unknown: { icon: CircleHelp, classes: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    running: { icon: LoaderCircle, classes: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
};

function StatusBadge({ status }) {
    const { icon: Icon, classes } = tones[status.tone];
    return (
        <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>
            <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${status.tone === 'running' ? 'motion-safe:animate-spin' : ''}`} />
            {status.label}
        </span>
    );
}

function ErrorNotice({ heading, children }) {
    return (
        <div role="alert" className={`flex min-w-0 items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${tones.failed.classes}`}>
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 wrap-anywhere">
                <p className="font-semibold">{heading}</p>
                {children && <p className="mt-0.5">{children}</p>}
            </div>
        </div>
    );
}

function SourceHealthCard({ source, info }) {
    const hasRun = info?.last_run_id != null;
    const showLegacy = source === 'gametora' && info?.status === 'unknown' && !info.last_success_at && info.legacy_last_synced_at;

    return (
        <article className={`min-w-0 p-4 sm:p-5 ${surfaces}`}>
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className={title}>{getSourceLabel(source)}</h3>
                <StatusBadge status={getSourceStatusMeta(info?.status)} />
            </div>
            <dl className="space-y-3 text-sm">
                <div>
                    <dt className={`text-xs font-semibold ${muted}`}>Run terakhir</dt>
                    <dd className="mt-0.5 wrap-anywhere text-slate-800 dark:text-slate-200">
                        {hasRun ? `Run #${info.last_run_id} · ${info.last_finished_at ? formatDateTime(info.last_finished_at) : `Mulai ${formatDateTime(info.last_started_at)}`}` : 'Belum ada riwayat sinkronisasi'}
                    </dd>
                </div>
                <div>
                    <dt className={`text-xs font-semibold ${muted}`}>Sinkronisasi sukses terakhir</dt>
                    <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                        {info?.last_success_at ? formatDateTime(info.last_success_at) : 'Belum pernah tercatat'}
                    </dd>
                </div>
            </dl>
            {showLegacy && <p className={`mt-3 text-xs ${muted}`}>Sync legacy terakhir: {formatDateTime(info.legacy_last_synced_at)}</p>}
            {info?.last_error && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs wrap-anywhere text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    <p className="font-semibold">Error terakhir</p>
                    <p className="mt-0.5">{info.last_error}</p>
                </div>
            )}
        </article>
    );
}

export function HealthOverview({ health }) {
    const overall = getOverallHealthMeta(health.overall_status);
    const { icon: Icon, classes } = tones[overall.tone];
    const issues = health.issues;
    const ids = Array.isArray(issues?.unresolved_select_pickup_ids) ? issues.unresolved_select_pickup_ids : [];
    const count = issues?.unresolved_select_pickup_count ?? (issues ? ids.length : null);

    return (
        <div className="space-y-6">
            <section aria-labelledby="health-overall" className={`flex items-start gap-4 p-4 sm:items-center sm:p-6 ${surfaces}`}>
                <div className={`rounded-2xl border p-3 ${classes}`}>
                    <Icon aria-hidden="true" className="size-6" />
                </div>
                <div className="min-w-0">
                    <h2 id="health-overall" className={`text-sm font-semibold ${muted}`}>Kesehatan keseluruhan</h2>
                    <p className={`mt-0.5 text-2xl tracking-tight ${title}`}>{overall.label}</p>
                    <p className={`mt-1 max-w-prose text-sm ${muted}`}>{overall.description}</p>
                </div>
            </section>

            <section aria-labelledby="health-sources">
                <h2 id="health-sources" className={`mb-3 text-lg ${title}`}>Status sinkronisasi terakhir</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {Object.keys(HEALTH_SOURCES).map(source => (
                        <SourceHealthCard key={source} source={source} info={health.sources?.[source]} />
                    ))}
                </div>
            </section>

            <section aria-labelledby="health-issues" className={`p-4 sm:p-5 ${surfaces}`}>
                <h2 id="health-issues" className={`mb-3 text-lg ${title}`}>Pemeriksaan Data</h2>
                {count > 0 ? (
                    <div className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm ${tones.degraded.classes}`}>
                        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="font-semibold">Ada {count} banner Select Pick Up yang belum memiliki lineup kandidat yang dapat digunakan.</p>
                            <p className="mt-1">Banner tetap tersimpan dan akan muncul di pilihan gacha setelah lineup valid tersedia.</p>
                            {ids.length > 0 && (
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                    {ids.map(id => <li key={id} className="rounded-md border border-current/25 px-2 py-1 font-mono text-xs">GameTora #{id}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : count === 0 ? (
                    <p className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-sm ${tones.healthy.classes}`}>
                        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
                        Tidak ada banner Select Pick Up tanpa kandidat yang terdeteksi.
                    </p>
                ) : <p className={`text-sm ${muted}`}>Hasil pemeriksaan belum tersedia.</p>}
            </section>
        </div>
    );
}

const runCountLabels = {
    created_count: 'Dibuat',
    updated_count: 'Diperbarui',
    unresolved_count: 'Belum terselesaikan',
    warning_count: 'Peringatan',
};

function SyncRunDetails({ run, child = false }) {
    const Heading = child ? 'h4' : 'h3';
    const finishedAt = run.is_finished === false ? null : run.finished_at;
    const metadata = getRunMetadataItems(run.metadata);
    const counts = Object.entries(runCountLabels).filter(([key]) => Number.isInteger(run[key]) && run[key] > 0);
    return (
        <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <Activity aria-hidden="true" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <Heading className={`min-w-0 wrap-anywhere ${child ? 'text-sm' : 'text-base'} ${title}`}>{getSourceLabel(run.source)}</Heading>
                {run.id != null && <span className={`font-mono text-xs ${muted}`}>#{run.id}</span>}
                <StatusBadge status={getRunStatusMeta(run.status, run.is_finished)} />
            </div>
            <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${muted}`}>
                <span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="size-3.5 shrink-0" /> Mulai {formatDateTime(run.started_at)}</span>
                {finishedAt && <span>Selesai {formatDateTime(finishedAt)}</span>}
                <span>Durasi {formatDuration(run.started_at, finishedAt)}</span>
                {!child && <span>{getTriggerLabel(run.trigger)}</span>}
            </div>
            {(metadata.length > 0 || counts.length > 0) && (
                <ul className="mt-2.5 flex min-w-0 flex-wrap gap-1.5 text-xs">
                    {counts.map(([key, label]) => (
                        <li key={key} className="max-w-full rounded-md bg-emerald-50 px-2 py-1 wrap-anywhere text-emerald-800 dark:bg-emerald-950/65 dark:text-emerald-300">{label}: {run[key]}</li>
                    ))}
                    {metadata.map(({ label, value }) => (
                        <li key={label} className="max-w-full rounded-md bg-slate-100 px-2 py-1 wrap-anywhere text-slate-700 dark:bg-slate-800 dark:text-slate-300">{value == null ? label : `${label}: ${value}`}</li>
                    ))}
                </ul>
            )}
            {run.error_summary && (
                <p className="mt-2.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs wrap-anywhere text-red-800 dark:bg-red-950/60 dark:text-red-200">
                    <strong>Ringkasan error</strong> · {run.error_summary}
                </p>
            )}
        </>
    );
}

export function SyncRunTimeline({ runs }) {
    if (runs.length === 0) {
        return (
            <div className={`rounded-xl border border-dashed border-slate-200 px-4 py-6 dark:border-slate-700`}>
                <p className={title}>Belum ada riwayat sinkronisasi.</p>
                <p className={`mt-1 text-sm ${muted}`}>Riwayat akan muncul setelah sinkronisasi GameTora, Cygames, atau Umapyoi tercatat.</p>
            </div>
        );
    }
    return (
        <ol className="space-y-3">
            {runs.map(run => (
                <li key={run.id} className="min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4 dark:border-slate-800">
                    <SyncRunDetails run={run} />
                    {Array.isArray(run.children) && run.children.length > 0 && (
                        <ol aria-label="Run turunan" className="mt-3 space-y-2.5 border-l-2 border-emerald-200 pl-2.5 sm:ml-2 sm:pl-4 dark:border-emerald-800">
                            {run.children.map(child => (
                                <li key={child.id} className="min-w-0 rounded-lg bg-slate-50 p-2.5 sm:p-3 dark:bg-slate-950/70">
                                    <SyncRunDetails run={child} child />
                                </li>
                            ))}
                        </ol>
                    )}
                </li>
            ))}
        </ol>
    );
}

function LoadingRows({ label }) {
    return (
        <div role="status" className="space-y-3 motion-safe:animate-pulse">
            <span className="sr-only">{label}</span>
            {[0, 1, 2].map(row => (
                <div key={row} aria-hidden="true" className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
        </div>
    );
}

const initialSection = { data: null, loading: true, error: false };

async function loadSection(url, accepts, signal, setSection) {
    try {
        const response = await fetch(url, { cache: 'no-store', signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (data?.success !== true || !accepts(data)) throw new Error();
        if (!signal.aborted) {
            setSection({ data, loading: false, error: false, receivedAt: new Date().toISOString() });
        }
    } catch {
        if (!signal.aborted) setSection(previous => ({ ...previous, loading: false, error: true }));
    }
}

export default function DataHealthView() {
    const [health, setHealth] = useState(initialSection);
    const [history, setHistory] = useState(initialSection);
    const [revision, setRevision] = useState(0);
    const loading = health.loading || history.loading;

    useEffect(() => {
        const controller = new AbortController();
        loadSection('/api/data-health', data => data.health && typeof data.health === 'object' && !Array.isArray(data.health), controller.signal, setHealth);
        loadSection('/api/data-health/sync-runs?limit=20', data => Array.isArray(data.runs), controller.signal, setHistory);
        return () => controller.abort();
    }, [revision]);

    function refresh() {
        setHealth(previous => ({ ...previous, loading: true }));
        setHistory(previous => ({ ...previous, loading: true }));
        setRevision(previous => previous + 1);
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className={`text-3xl tracking-tight ${title}`}>Data Health</h1>
                    <p className={`mt-1 text-sm ${muted}`}>Status sinkronisasi dan kesehatan data GameTora, Cygames, serta Umapyoi.</p>
                    {health.receivedAt && <p className={`mt-2 text-xs ${muted}`}>Diperbarui di halaman: {formatDateTime(health.receivedAt)}</p>}
                </div>
                <button type="button" onClick={refresh} disabled={loading} aria-label="Muat ulang Data Health dan riwayat sinkronisasi"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/60">
                    <RefreshCw aria-hidden="true" className={`size-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />
                    Muat Ulang
                </button>
            </header>

            <div aria-busy={health.loading} className="space-y-3">
                {health.error && (
                    <ErrorNotice heading="Data Health belum dapat dimuat.">
                        {health.data ? 'Menampilkan data terakhir yang berhasil dimuat.' : 'Periksa koneksi aplikasi atau status migrasi database, lalu coba muat ulang.'}
                    </ErrorNotice>
                )}
                {health.loading && !health.data && (
                    <div className={`p-4 ${surfaces}`}><LoadingRows label="Memuat Data Health" /></div>
                )}
                {health.data && <HealthOverview health={health.data.health} />}
            </div>

            <section aria-labelledby="health-history" aria-busy={history.loading} className={`p-4 sm:p-5 ${surfaces}`}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h2 id="health-history" className={`flex items-center gap-2 text-lg ${title}`}>
                            <History aria-hidden="true" className="size-5 text-emerald-600 dark:text-emerald-400" />
                            Riwayat Sinkronisasi
                        </h2>
                        <p className={`mt-1 text-sm ${muted}`}>Hingga 20 eksekusi terbaru beserta sumber turunan yang dijalankan.</p>
                    </div>
                    {Number.isInteger(history.data?.meta?.returned) && history.data.meta.returned > 0 && (
                        <span className={`text-xs font-semibold ${muted}`}>{history.data.meta.returned} eksekusi</span>
                    )}
                </div>
                <div className="space-y-3">
                    {history.error && (
                        <ErrorNotice heading="Riwayat sinkronisasi belum dapat dimuat.">
                            {history.data ? 'Menampilkan riwayat terakhir yang berhasil dimuat.' : null}
                        </ErrorNotice>
                    )}
                    {history.loading && !history.data && <LoadingRows label="Memuat riwayat sinkronisasi" />}
                    {history.data && <SyncRunTimeline runs={history.data.runs} />}
                </div>
            </section>
            <p className={`text-xs ${muted}`}>Status berasal dari riwayat sinkronisasi lokal. Muat Ulang membaca data yang sudah tercatat.</p>
        </div>
    );
}
