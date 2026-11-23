<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\SyncRun;

final class DataHealthService
{
    /**
     * @return array{overall_status: string, sources: array<string, array<string, mixed>>, issues: array{unresolved_select_pickup_count: int, unresolved_select_pickup_ids: list<int>}}
     */
    public function snapshot(): array
    {
        $unresolvedIds = GachaBanner::unresolvedSelectPickup()->distinct()->orderBy('gametora_id')->pluck('gametora_id')->all();
        $sources = [
            SyncRun::SOURCE_GAMETORA => $this->source(SyncRun::SOURCE_GAMETORA),
            SyncRun::SOURCE_CYGAMES => $this->source(SyncRun::SOURCE_CYGAMES),
            SyncRun::SOURCE_UMAPYOI => $this->source(SyncRun::SOURCE_UMAPYOI),
        ];
        $gameTora = $sources[SyncRun::SOURCE_GAMETORA]['status'];
        $sourceProblems = [SyncRun::STATUS_DEGRADED, SyncRun::STATUS_FAILED];

        return [
            'overall_status' => match (true) {
                $gameTora === 'unknown' => 'unknown',
                $gameTora === SyncRun::STATUS_FAILED => 'failed',
                $unresolvedIds !== [] => 'degraded',
                (string) AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY) === '' => 'degraded',
                in_array($sources[SyncRun::SOURCE_CYGAMES]['status'], $sourceProblems, true),
                in_array($sources[SyncRun::SOURCE_UMAPYOI]['status'], $sourceProblems, true) => 'degraded',
                default => 'healthy',
            },
            'sources' => $sources,
            'issues' => [
                'unresolved_select_pickup_count' => count($unresolvedIds),
                'unresolved_select_pickup_ids' => $unresolvedIds,
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function source(string $source): array
    {
        $runs = SyncRun::forSource($source);
        $lastRun = (clone $runs)->finished()->latestFirst()->first()
            ?? (clone $runs)->latestFirst()->first();
        $lastSuccess = $runs->finished()->where('status', SyncRun::STATUS_SUCCESS)->orderByDesc('finished_at')->first();
        $health = [
            'status' => $lastRun?->finished_at === null ? 'unknown' : $lastRun->status,
            'last_run_id' => $lastRun?->id,
            'last_started_at' => $lastRun?->started_at->toIso8601String(),
            'last_finished_at' => $lastRun?->finished_at?->toIso8601String(),
            'last_success_at' => $lastSuccess?->finished_at->toIso8601String(),
            'last_error' => $lastRun?->error_summary,
        ];
        if ($source === SyncRun::SOURCE_GAMETORA) {
            $health['legacy_last_synced_at'] = $lastRun === null ? AppSetting::getValue('gametora_last_synced_at') : null;
        }

        return $health;
    }
}
