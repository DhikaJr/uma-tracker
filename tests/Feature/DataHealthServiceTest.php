<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\SyncRun;
use App\Services\DataHealthService;
use App\Services\GameToraSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class DataHealthServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshot_without_history_is_read_only_and_unknown(): void
    {
        Http::fake();
        DB::enableQueryLog();
        DB::flushQueryLog();

        try {
            $snapshot = app(DataHealthService::class)->snapshot();
            $queries = array_column(DB::getQueryLog(), 'query');
        } finally {
            DB::disableQueryLog();
        }

        $this->assertSame('unknown', $snapshot['overall_status']);
        $this->assertSame(['gametora', 'cygames', 'umapyoi'], array_keys($snapshot['sources']));
        $this->assertSame(['unknown', 'unknown', 'unknown'], array_column($snapshot['sources'], 'status'));
        $this->assertNull($snapshot['sources']['gametora']['last_success_at']);
        $this->assertNotEmpty($queries);
        foreach ($queries as $query) {
            $this->assertStringStartsWith('select ', strtolower($query));
        }
        $this->assertDatabaseCount('sync_runs', 0);
        Http::assertNothingSent();
    }

    public function test_legacy_sync_timestamp_does_not_count_as_success(): void
    {
        $legacyTime = '2026-11-22T12:30:00+07:00';
        AppSetting::setValue('gametora_last_synced_at', $legacyTime);

        $snapshot = app(DataHealthService::class)->snapshot();

        $this->assertSame('unknown', $snapshot['overall_status']);
        $this->assertSame($legacyTime, $snapshot['sources']['gametora']['legacy_last_synced_at']);
        $this->assertNull($snapshot['sources']['gametora']['last_success_at']);
        $this->assertDatabaseCount('sync_runs', 0);
    }

    #[TestWith([SyncRun::STATUS_SUCCESS, 'healthy'])]
    #[TestWith([SyncRun::STATUS_DEGRADED, 'healthy'])]
    #[TestWith([SyncRun::STATUS_FAILED, 'failed'])]
    public function test_latest_completed_gametora_run_determines_overall_health(string $status, string $overall): void
    {
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $earlier = SyncRun::factory()->create(['started_at' => now()->subDay(), 'finished_at' => now()->subDay()]);
        $latest = SyncRun::factory()->create([
            'status' => $status,
            'error_summary' => $status === SyncRun::STATUS_SUCCESS ? null : 'Koneksi ke sumber gagal.',
        ]);
        SyncRun::factory()->create(['started_at' => now()->addSecond(), 'finished_at' => null]);

        $snapshot = app(DataHealthService::class)->snapshot();
        $gameTora = $snapshot['sources']['gametora'];

        $this->assertSame($overall, $snapshot['overall_status']);
        $this->assertSame($latest->id, $gameTora['last_run_id']);
        $this->assertSame($status, $gameTora['status']);
        $this->assertSame($latest->fresh()->started_at->toIso8601String(), $gameTora['last_started_at']);
        $this->assertSame($latest->fresh()->finished_at->toIso8601String(), $gameTora['last_finished_at']);
        $this->assertSame($latest->error_summary, $gameTora['last_error']);
        $expectedSuccess = $status === SyncRun::STATUS_SUCCESS ? $latest : $earlier;
        $this->assertSame($expectedSuccess->fresh()->finished_at->toIso8601String(), $gameTora['last_success_at']);
    }

    public function test_only_unresolved_gametora_select_pickup_support_banners_degrade_healthy_state(): void
    {
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        SyncRun::factory()->create();
        $attributes = [
            'name' => 'Health fixture', 'category' => 'select_rate_up',
            'banner_type' => 'support_card', 'start_date' => '2026-11-16',
        ];
        foreach ([
            ['gametora_id' => 30485, 'featured_items' => []],
            ['gametora_id' => 30486, 'featured_items' => null],
            ['gametora_id' => 30487, 'featured_items' => ['Known card']],
            ['gametora_id' => 30488, 'featured_items' => [], 'category' => 'standard'],
            ['gametora_id' => 30489, 'featured_items' => [], 'banner_type' => 'character'],
            ['gametora_id' => null, 'featured_items' => []],
            ['gametora_id' => 0, 'featured_items' => []],
        ] as $fixture) {
            GachaBanner::create($fixture + $attributes);
        }

        $snapshot = app(DataHealthService::class)->snapshot();

        $this->assertSame('degraded', $snapshot['overall_status']);
        $this->assertSame([
            'unresolved_select_pickup_count' => 2,
            'unresolved_select_pickup_ids' => [30485, 30486],
        ], $snapshot['issues']);
    }

    public function test_optional_source_failure_remains_current_when_newer_gametora_run_skips_that_source(): void
    {
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $olderParent = SyncRun::factory()->create([
            'status' => SyncRun::STATUS_DEGRADED,
            'started_at' => now()->subDay(), 'finished_at' => now()->subDay(),
        ]);
        $child = SyncRun::factory()->for($olderParent, 'parent')->create([
            'source' => SyncRun::SOURCE_UMAPYOI, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
            'status' => SyncRun::STATUS_FAILED, 'started_at' => now()->subDay(), 'finished_at' => now()->subDay(),
        ]);
        $newerParent = SyncRun::factory()->create();

        $snapshot = app(DataHealthService::class)->snapshot();

        $this->assertSame('degraded', $snapshot['overall_status']);
        $this->assertSame($newerParent->id, $snapshot['sources']['gametora']['last_run_id']);
        $this->assertSame($child->id, $snapshot['sources']['umapyoi']['last_run_id']);
        $this->assertSame(SyncRun::STATUS_FAILED, $snapshot['sources']['umapyoi']['status']);
    }

    #[TestWith([SyncRun::STATUS_DEGRADED, true, false, 'healthy'])]
    #[TestWith([SyncRun::STATUS_FAILED, true, false, 'failed'])]
    #[TestWith([SyncRun::STATUS_DEGRADED, true, true, 'degraded'])]
    #[TestWith([SyncRun::STATUS_SUCCESS, false, false, 'degraded'])]
    public function test_direct_source_recoveries_only_supersede_optional_source_failures(
        string $parentStatus,
        bool $hasCheckpoint,
        bool $unresolved,
        string $expectedOverall,
    ): void {
        if ($hasCheckpoint) {
            AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        }
        if ($unresolved) {
            GachaBanner::create([
                'gametora_id' => 30485, 'name' => 'Select Pick Up fixture', 'category' => 'select_rate_up',
                'banner_type' => 'support_card', 'start_date' => '2026-11-16', 'featured_items' => [],
            ]);
        }
        $parent = SyncRun::factory()->create(['status' => $parentStatus, 'started_at' => now()->subDay()]);
        $sources = [SyncRun::SOURCE_CYGAMES, SyncRun::SOURCE_UMAPYOI];
        foreach ($sources as $source) {
            SyncRun::factory()->for($parent, 'parent')->create([
                'source' => $source, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
                'status' => SyncRun::STATUS_FAILED, 'started_at' => now()->subDay(),
            ]);
        }
        $health = app(DataHealthService::class);
        $this->assertSame($parentStatus === SyncRun::STATUS_FAILED ? 'failed' : 'degraded', $health->snapshot()['overall_status']);

        foreach ($sources as $source) {
            $directRuns[$source] = SyncRun::factory()->create(['source' => $source]);
        }
        $snapshot = $health->snapshot();

        $this->assertSame($expectedOverall, $snapshot['overall_status']);
        $this->assertSame((int) $unresolved, $snapshot['issues']['unresolved_select_pickup_count']);
        foreach ($directRuns as $source => $run) {
            $this->assertSame($run->id, $snapshot['sources'][$source]['last_run_id']);
            $this->assertSame(SyncRun::STATUS_SUCCESS, $snapshot['sources'][$source]['status']);
        }
        $this->assertSame($parentStatus, $parent->refresh()->status);
        $this->assertSame(2, $parent->children()->where('status', SyncRun::STATUS_FAILED)->count());
    }

    #[TestWith(['2026-11-23 10:01:00'])]
    #[TestWith(['2026-11-23 10:00:00'])]
    public function test_overlapping_runs_order_latest_invocation_by_start_then_id(string $laterStart): void
    {
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $earlier = SyncRun::factory()->create(['started_at' => '2026-11-23 10:00:00', 'finished_at' => '2026-11-23 10:03:00']);
        $later = SyncRun::factory()->create([
            'started_at' => $laterStart, 'finished_at' => '2026-11-23 10:02:00', 'status' => SyncRun::STATUS_FAILED,
        ]);
        SyncRun::factory()->create(['started_at' => '2026-11-23 10:04:00', 'finished_at' => null]);

        $snapshot = app(DataHealthService::class)->snapshot();

        $this->assertSame('failed', $snapshot['overall_status']);
        $this->assertSame($later->id, $snapshot['sources']['gametora']['last_run_id']);
        $this->assertSame($earlier->fresh()->finished_at->toIso8601String(), $snapshot['sources']['gametora']['last_success_at']);
    }
}
