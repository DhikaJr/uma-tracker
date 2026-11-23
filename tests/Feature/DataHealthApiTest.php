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
use RuntimeException;
use Tests\TestCase;

class DataHealthApiTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith([SyncRun::STATUS_SUCCESS, 'healthy'])]
    #[TestWith([SyncRun::STATUS_DEGRADED, 'degraded'])]
    #[TestWith([SyncRun::STATUS_FAILED, 'failed'])]
    #[TestWith([null, 'unknown'])]
    public function test_snapshot_returns_health_state_with_http_200(?string $status, string $expected): void
    {
        if ($status === null) {
            AppSetting::setValue('gametora_last_synced_at', '2026-11-22T12:30:00+00:00');
        } else {
            AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
            SyncRun::factory()->create(['status' => $status]);
        }

        $response = $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('health.overall_status', $expected)
            ->assertExactJson(['success' => true, 'health' => app(DataHealthService::class)->snapshot()]);

        if ($status === null) {
            $response->assertJsonPath('health.sources.gametora.legacy_last_synced_at', '2026-11-22T12:30:00+00:00');
        }
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_snapshot_reflects_restore_invalidated_checkpoint_on_next_request(): void
    {
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $run = SyncRun::factory()->create();
        $this->getJson('/api/data-health')->assertOk()->assertJsonPath('health.overall_status', 'healthy');

        AppSetting::where('key', GameToraSyncService::MANIFEST_CHECKPOINT_KEY)->delete();

        $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('health.overall_status', 'degraded')
            ->assertJsonPath('health.sources.gametora.status', 'success')
            ->assertJsonPath('health.sources.gametora.last_run_id', $run->id)
            ->assertJsonPath('health.issues.unresolved_select_pickup_ids', []);
    }

    #[TestWith([null, 20, 20])]
    #[TestWith([1, 1, 1])]
    #[TestWith([5, 5, 5])]
    #[TestWith([50, 50, 25])]
    public function test_history_limits_root_runs_and_preserves_children(?int $limit, int $effectiveLimit, int $returned): void
    {
        $roots = SyncRun::factory()->count(25)->create(['started_at' => '2026-11-23 12:00:00', 'finished_at' => '2026-11-23 12:00:03']);
        $latest = $roots->last();
        $children = SyncRun::factory()->count(2)->for($latest, 'parent')->create([
            'source' => SyncRun::SOURCE_CYGAMES, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
            'started_at' => '2026-11-23 12:00:01', 'finished_at' => '2026-11-23 12:00:02',
        ]);
        $url = '/api/data-health/sync-runs'.($limit === null ? '' : "?limit={$limit}");

        $response = $this->getJson($url)->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta', ['limit' => $effectiveLimit, 'returned' => $returned])
            ->assertJsonCount($returned, 'runs')
            ->assertJsonPath('runs.0.id', $latest->id);

        $this->assertSame($children->modelKeys(), array_column($response->json('runs.0.children'), 'id'));
        $this->assertSame($roots->reverse()->take($returned)->values()->modelKeys(), array_column($response->json('runs'), 'id'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    #[TestWith(['limit=0'])]
    #[TestWith(['limit=51'])]
    #[TestWith(['limit=abc'])]
    #[TestWith(['limit=1.5'])]
    #[TestWith(['limit='])]
    #[TestWith(['limit%5B%5D=5'])]
    public function test_invalid_limits_return_validation_response_even_without_json_accept_header(string $query): void
    {
        $response = $this->get('/api/data-health/sync-runs?'.$query)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('limit')
            ->assertJsonPath('message', 'Parameter limit harus berupa bilangan bulat antara 1 dan 50.');

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_empty_history_returns_an_empty_root_list(): void
    {
        $this->getJson('/api/data-health/sync-runs')->assertOk()->assertExactJson([
            'success' => true, 'runs' => [], 'meta' => ['limit' => 20, 'returned' => 0],
        ]);
    }

    public function test_history_orders_invocations_and_keeps_direct_and_unlinked_embedded_roots(): void
    {
        $parent = SyncRun::factory()->create(['started_at' => '2026-11-23 12:00:00', 'finished_at' => '2026-11-23 12:00:03']);
        $older = SyncRun::factory()->create(['started_at' => '2026-11-23 11:00:00', 'finished_at' => '2026-11-23 12:00:06']);
        $direct = SyncRun::factory()->create([
            'source' => SyncRun::SOURCE_CYGAMES, 'trigger' => SyncRun::TRIGGER_DIRECT,
            'started_at' => '2026-11-23 12:00:00', 'finished_at' => '2026-11-23 12:00:01',
        ]);
        $unlinked = SyncRun::factory()->create([
            'source' => SyncRun::SOURCE_UMAPYOI, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
            'started_at' => '2026-11-23 11:30:00', 'finished_at' => '2026-11-23 11:30:01',
        ]);
        $laterChild = SyncRun::factory()->for($parent, 'parent')->create([
            'source' => SyncRun::SOURCE_UMAPYOI, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
            'started_at' => '2026-11-23 12:00:02', 'finished_at' => '2026-11-23 12:00:03',
        ]);
        $sameStartChildren = SyncRun::factory()->count(2)->for($parent, 'parent')->create([
            'source' => SyncRun::SOURCE_CYGAMES, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
            'started_at' => '2026-11-23 12:00:01', 'finished_at' => '2026-11-23 12:00:02',
        ]);
        SyncRun::factory()->for($sameStartChildren->first(), 'parent')->create();

        $response = $this->getJson('/api/data-health/sync-runs')->assertOk()
            ->assertJsonPath('runs.0.trigger', SyncRun::TRIGGER_DIRECT)
            ->assertJsonPath('runs.2.trigger', SyncRun::TRIGGER_EMBEDDED)
            ->assertJsonPath('runs.2.parent_id', null)
            ->assertJsonPath('runs.2.children', []);

        $this->assertSame([$direct->id, $parent->id, $unlinked->id, $older->id], array_column($response->json('runs'), 'id'));
        $this->assertSame([...$sameStartChildren->modelKeys(), $laterChild->id], array_column($response->json('runs.1.children'), 'id'));
        foreach ($response->json('runs.1.children') as $child) {
            $this->assertArrayNotHasKey('children', $child);
        }
    }

    public function test_history_serializes_only_public_fields_and_masks_unfinished_status(): void
    {
        $root = SyncRun::factory()->create([
            'trigger' => SyncRun::TRIGGER_MANUAL, 'finished_at' => null, 'started_at' => '2026-11-23 12:00:00',
            'metadata' => [
                'mode' => 'full', 'force' => false, 'secret_internal_probe' => 'should_not_leak',
                'index_fetch_ok' => 'Authorization: Bearer token', 'banners_processed' => ['raw_html' => '<p>Private</p>'],
            ],
        ]);
        $child = SyncRun::factory()->for($root, 'parent')->create([
            'source' => SyncRun::SOURCE_UMAPYOI, 'trigger' => SyncRun::TRIGGER_EMBEDDED, 'status' => SyncRun::STATUS_DEGRADED,
            'started_at' => '2026-11-23 12:00:01', 'finished_at' => '2026-11-23 12:00:02',
            'warning_count' => 1, 'error_summary' => 'Permintaan sumber gagal (HTTP 503).',
            'metadata' => ['lineups_found' => 1, 'mode' => 'C:\\private\\ca.pem', 'request_headers' => ['token']],
        ]);

        $this->getJson('/api/data-health/sync-runs?limit=5')->assertOk()->assertExactJson([
            'success' => true,
            'runs' => [[
                'id' => $root->id, 'parent_id' => null, 'source' => 'gametora', 'trigger' => 'manual',
                'status' => null, 'is_finished' => false, 'started_at' => '2026-11-23T12:00:00+00:00', 'finished_at' => null,
                'created_count' => null, 'updated_count' => null, 'unresolved_count' => 0, 'warning_count' => 0,
                'error_summary' => null, 'metadata' => ['mode' => 'full', 'force' => false],
                'children' => [[
                    'id' => $child->id, 'parent_id' => $root->id, 'source' => 'umapyoi', 'trigger' => 'embedded',
                    'status' => 'degraded', 'is_finished' => true,
                    'started_at' => '2026-11-23T12:00:01+00:00', 'finished_at' => '2026-11-23T12:00:02+00:00',
                    'created_count' => null, 'updated_count' => null, 'unresolved_count' => 0, 'warning_count' => 1,
                    'error_summary' => 'Permintaan sumber gagal (HTTP 503).', 'metadata' => ['lineups_found' => 1],
                ]],
            ]],
            'meta' => ['limit' => 5, 'returned' => 1],
        ]);
    }

    public function test_endpoints_report_unresolved_banner_with_select_only_and_no_http(): void
    {
        $banner = GachaBanner::create([
            'gametora_id' => 30485, 'category' => 'select_rate_up', 'banner_type' => 'support_card',
            'name' => 'Select Pick Up (Nov 2026)', 'start_date' => '2026-11-16', 'featured_items' => [],
        ]);
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        SyncRun::factory()->create();
        Http::fake();
        DB::enableQueryLog();
        DB::flushQueryLog();

        try {
            $this->getJson('/api/data-health')->assertOk()
                ->assertJsonPath('health.overall_status', 'degraded')
                ->assertJsonPath('health.issues.unresolved_select_pickup_count', 1)
                ->assertJsonPath('health.issues.unresolved_select_pickup_ids', [30485]);
            $this->getJson('/api/data-health/sync-runs')->assertOk()->assertJsonCount(1, 'runs');
            $queries = array_column(DB::getQueryLog(), 'query');
        } finally {
            DB::disableQueryLog();
        }

        $this->assertNotEmpty($queries);
        foreach ($queries as $query) {
            $this->assertStringStartsWith('select ', strtolower(ltrim($query)));
        }
        Http::assertNothingSent();
        $this->assertSame([], $banner->refresh()->featured_items);
        $this->assertSame('verified-manifest', AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
    }

    public function test_database_failures_return_safe_errors_even_in_debug_mode(): void
    {
        config(['app.debug' => true]);
        $failReads = true;
        DB::connection()->beforeExecuting(function (string $query) use (&$failReads): void {
            if ($failReads && str_contains($query, '"sync_runs"')) {
                throw new RuntimeException('Database failure at C:\\private\\data.sqlite');
            }
        });

        try {
            foreach (['/api/data-health', '/api/data-health/sync-runs'] as $url) {
                $response = $this->getJson($url)->assertInternalServerError()
                    ->assertExactJson(['success' => false, 'message' => 'Data kesehatan tidak dapat dibaca.']);
                $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            }
        } finally {
            $failReads = false;
        }
    }
}
