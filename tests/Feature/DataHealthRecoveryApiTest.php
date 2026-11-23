<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\SyncRun;
use App\Models\UmaCatalogItem;
use App\Services\CygamesNewsService;
use App\Services\GameToraSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\TestCase;

class DataHealthRecoveryApiTest extends TestCase
{
    use RefreshDatabase;

    private const CYGAMES_ACTION = '/api/data-health/actions/recheck-cygames';

    private const UMAPYOI_ACTION = '/api/data-health/actions/recheck-umapyoi';

    private const UMAPYOI_SEARCH = 'https://umapyoi.net/api/v1/news/search/twinkle';

    public function test_targeted_recovery_repairs_official_lineup_and_recovers_current_health_without_a_new_gametora_sync(): void
    {
        $article = $this->officialArticle();
        $banner = $this->unresolvedBanner();
        $candidates = [];
        foreach (app(CygamesNewsService::class)->parseArticle($article)['raw_candidates'] as $candidate) {
            $name = "SSR [{$candidate['title']}] {$candidate['character']}";
            $candidates[] = $name;
            UmaCatalogItem::create([
                'type' => 'support_card', 'name' => $name, 'rarity' => 'SSR',
                'raw_data' => ['title_ja' => $candidate['title']],
            ]);
        }
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $parent = SyncRun::factory()->create(['status' => SyncRun::STATUS_DEGRADED, 'unresolved_count' => 1, 'started_at' => now()->subDay()]);
        foreach ([SyncRun::SOURCE_CYGAMES, SyncRun::SOURCE_UMAPYOI] as $source) {
            SyncRun::factory()->for($parent, 'parent')->create([
                'source' => $source, 'trigger' => SyncRun::TRIGGER_EMBEDDED,
                'status' => SyncRun::STATUS_FAILED, 'started_at' => now()->subDay(),
            ]);
        }
        Http::fake([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(['information_list' => [$article]]),
            CygamesNewsService::NEWS_DETAIL_URL.'*announce_id=3547' => Http::response(['detail' => $article]),
            self::UMAPYOI_SEARCH => Http::response([]),
        ]);
        $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('health.overall_status', 'degraded')
            ->assertJsonPath('health.issues.unresolved_select_pickup_ids', [$banner->gametora_id]);

        $cygames = $this->assertDirectRun($this->postJson(self::CYGAMES_ACTION.'?force=true', [
            'force' => true, 'banner_id' => 1, 'announcement_id' => 1, 'source' => 'gametora',
        ]), SyncRun::SOURCE_CYGAMES, SyncRun::STATUS_SUCCESS, 'Cygames');

        $this->assertFalse($cygames->metadata['force']);
        $this->assertCount(10, $banner->refresh()->featured_items);
        $this->assertSame($candidates, $banner->featured_items);
        $this->assertSame(CygamesNewsService::NEWS_WEB_BASE_URL.'3547', $banner->getProvenanceUrl());
        $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('health.sources.cygames.last_run_id', $cygames->id)
            ->assertJsonPath('health.issues.unresolved_select_pickup_count', 0)
            ->assertJsonPath('health.overall_status', 'degraded');

        $umapyoi = $this->assertDirectRun($this->postJson(self::UMAPYOI_ACTION), SyncRun::SOURCE_UMAPYOI, SyncRun::STATUS_SUCCESS, 'Umapyoi');

        $this->assertSame(0, $umapyoi->metadata['lineups_found']);
        $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('health.overall_status', 'healthy')
            ->assertJsonPath('health.sources.umapyoi.last_run_id', $umapyoi->id)
            ->assertJsonPath('health.sources.gametora.status', SyncRun::STATUS_DEGRADED);
        $this->getJson('/api/data-health/sync-runs')->assertOk()
            ->assertJsonPath('runs.0.id', $umapyoi->id)
            ->assertJsonPath('runs.1.id', $cygames->id)
            ->assertJsonPath('runs.2.id', $parent->id)
            ->assertJsonPath('runs.2.status', SyncRun::STATUS_DEGRADED)
            ->assertJsonCount(2, 'runs.2.children');
        $this->assertSame($parent->id, SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->sole()->id);
        Http::assertSentCount(3);
    }

    public function test_cygames_recheck_without_resolvable_authority_preserves_banner_pull_and_pity(): void
    {
        $banner = $this->unresolvedBanner();
        $pull = $banner->pulls()->create([
            'banner_type' => 'support_card', 'pull_type' => 'single', 'item_name' => 'Historical card',
            'rarity' => 'SSR', 'is_rate_up' => false, 'pity_count_at_pull' => 12, 'pulled_at' => now(),
        ]);
        $pity = $banner->pity()->create(['banner_type' => 'support_card', 'current_pity' => 12]);
        UmaCatalogItem::create(['type' => 'support_card', 'name' => 'Unrelated generic pool card', 'rarity' => 'SSR']);
        SyncRun::factory()->create(['status' => SyncRun::STATUS_DEGRADED]);
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'verified-manifest');
        $article = $this->officialArticle();
        Http::fake([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(['information_list' => [$article]]),
            CygamesNewsService::NEWS_DETAIL_URL.'*announce_id=3547' => Http::response(['detail' => $article]),
        ]);

        $this->assertDirectRun($this->postJson(self::CYGAMES_ACTION), SyncRun::SOURCE_CYGAMES, SyncRun::STATUS_FAILED, 'Cygames');

        $this->assertSame([], $banner->refresh()->featured_items);
        $this->assertNull($banner->getProvenanceUrl());
        $this->assertSame($banner->id, $pull->refresh()->gacha_banner_id);
        $this->assertSame(12, $pull->pity_count_at_pull);
        $this->assertSame($banner->id, $pity->refresh()->gacha_banner_id);
        $this->assertSame(12, $pity->current_pity);
        $this->getJson('/api/data-health')->assertOk()
            ->assertJsonPath('health.issues.unresolved_select_pickup_count', 1)
            ->assertJsonPath('health.overall_status', 'degraded');
    }

    public function test_cygames_outage_preserves_last_known_good_official_lineup_and_provenance(): void
    {
        $banner = $this->unresolvedBanner();
        $lineup = array_map(fn (int $index): string => "Previously verified card {$index}", range(1, 10));
        $banner->update(['featured_items' => $lineup]);
        $provenance = CygamesNewsService::NEWS_WEB_BASE_URL.'3547';
        AppSetting::setValue("select_pickup_provenance_{$banner->gametora_id}", $provenance);
        $bannerCount = GachaBanner::count();
        Http::fake([CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(null, 503)]);

        $this->assertDirectRun($this->postJson(self::CYGAMES_ACTION), SyncRun::SOURCE_CYGAMES, SyncRun::STATUS_DEGRADED, 'Cygames');

        $this->assertSame($lineup, $banner->refresh()->featured_items);
        $this->assertSame($provenance, $banner->getProvenanceUrl());
        $this->assertDatabaseCount('gacha_banners', $bannerCount);
    }

    public function test_umapyoi_extracts_lineup_without_writing_banner_data(): void
    {
        $this->unresolvedBanner();
        GachaBanner::create([
            'gametora_id' => 30490, 'name' => 'Twinkle Collection', 'start_date' => '2026-09-02',
            'banner_type' => 'character', 'category' => 'twinkle', 'featured_items' => ['Existing [Official]'],
        ]);
        $bannersBefore = GachaBanner::orderBy('id')->get()->toArray();
        Http::fake([
            self::UMAPYOI_SEARCH => Http::response([
                ['announce_id' => 999, 'title' => 'Twinkle Collection', 'post_at' => strtotime('2026-09-02')],
            ]),
            'https://umapyoi.net/api/v1/news/999' => Http::response([
                'message_english' => '<img src="gacha_banner_30490.png">■ Eligible Umamusume<br>★★★ [Different] Tokai Teio<br>■',
            ]),
        ]);

        $run = $this->assertDirectRun($this->postJson(self::UMAPYOI_ACTION), SyncRun::SOURCE_UMAPYOI, SyncRun::STATUS_SUCCESS, 'Umapyoi');

        $this->assertSame(1, $run->metadata['lineups_found']);
        $this->assertSame($bannersBefore, GachaBanner::orderBy('id')->get()->toArray());
        $this->assertDatabaseCount('sync_runs', 1);
        Http::assertSentCount(2);
    }

    public function test_umapyoi_timeout_is_a_completed_request_with_sanitized_failed_telemetry(): void
    {
        Http::fake([self::UMAPYOI_SEARCH => Http::failedConnection('cURL error 28: private upstream details')]);

        $run = $this->assertDirectRun($this->postJson(self::UMAPYOI_ACTION), SyncRun::SOURCE_UMAPYOI, SyncRun::STATUS_FAILED, 'Umapyoi');

        $this->assertSame('Koneksi ke sumber gagal (cURL 28).', $run->error_summary);
        $this->assertDatabaseCount('sync_runs', 1);
    }

    public function test_recheck_succeeds_when_recording_fails_without_returning_stale_telemetry(): void
    {
        SyncRun::factory()->create(['source' => SyncRun::SOURCE_UMAPYOI]);
        Event::listen('eloquent.creating: '.SyncRun::class, function (): never {
            throw new RuntimeException('Telemetry unavailable');
        });
        Http::fake([self::UMAPYOI_SEARCH => Http::response([])]);

        $this->postJson(self::UMAPYOI_ACTION)->assertOk()->assertExactJson([
            'success' => true, 'source' => 'umapyoi', 'action' => 'recheck_umapyoi',
            'source_status' => 'unknown', 'run_id' => null, 'message' => 'Pemeriksaan ulang Umapyoi selesai.',
        ]);

        Http::assertSentCount(1);
        $this->assertDatabaseCount('sync_runs', 1);
    }

    public function test_controller_exception_returns_only_the_sanitized_error_even_in_debug_mode(): void
    {
        config(['app.debug' => true]);
        $this->mock(CygamesNewsService::class)
            ->shouldReceive('syncSelectPickupBanners')->once()->with(false)
            ->andThrow(new RuntimeException('SQLSTATE: private filesystem path and upstream payload'));

        $this->postJson(self::CYGAMES_ACTION)->assertInternalServerError()->assertExactJson([
            'success' => false,
            'message' => 'Pemeriksaan ulang sumber tidak dapat dijalankan.',
        ]);
    }

    private function assertDirectRun(TestResponse $response, string $source, string $status, string $label): SyncRun
    {
        $response->assertOk()->assertExactJson([
            'success' => true, 'action' => "recheck_{$source}", 'source' => $source,
            'source_status' => $status, 'run_id' => $response->json('run_id'),
            'message' => "Pemeriksaan ulang {$label} selesai.",
        ]);
        $run = SyncRun::finished()->findOrFail($response->json('run_id'));
        $this->assertSame($source, $run->source);
        $this->assertSame($status, $run->status);
        $this->assertSame(SyncRun::TRIGGER_DIRECT, $run->trigger);
        $this->assertNull($run->parent_id);

        return $run;
    }

    /** @return array<string, mixed> */
    private function officialArticle(): array
    {
        return json_decode(file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3547.json')), true)['detail'];
    }

    private function unresolvedBanner(): GachaBanner
    {
        return GachaBanner::create([
            'gametora_id' => 30485, 'banner_type' => 'support_card', 'category' => 'select_rate_up',
            'name' => 'Select Pick Up (Nov 2026)', 'start_date' => '2026-11-16', 'featured_items' => [],
        ]);
    }
}
