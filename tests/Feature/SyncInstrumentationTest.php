<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\SyncRun;
use App\Models\UmaCatalogItem;
use App\Services\CygamesNewsService;
use App\Services\DataHealthService;
use App\Services\GameToraSyncService;
use App\Services\SyncRunRecorder;
use App\Support\UmaCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\TestWith;
use RuntimeException;
use Tests\TestCase;

class SyncInstrumentationTest extends TestCase
{
    use RefreshDatabase;

    private const UMAPYOI_SEARCH = 'https://umapyoi.net/api/v1/news/search/twinkle';

    private const UMAPYOI_NEWS = 'https://umapyoi.net/api/v1/news/';

    public function test_manual_full_sync_records_success_and_both_children_before_returning_existing_payload(): void
    {
        $this->fakeGameTora([
            GameToraSyncService::MANIFEST_URL => function () {
                $started = SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->sole();
                $this->assertNull($started->finished_at);
                $this->assertSame(SyncRun::TRIGGER_MANUAL, $started->trigger);

                return Http::response($this->manifest());
            },
            self::UMAPYOI_SEARCH => Http::response([$this->twinkleArticle(1)]),
            self::UMAPYOI_NEWS.'1' => Http::response($this->twinkleDetail()),
        ]);

        $response = $this->postJson('/api/gacha/sync-gametora')->assertOk()
            ->assertJsonPath('success', true)->assertJsonPath('is_up_to_date', false);

        $this->assertSame(['success', 'is_up_to_date', 'message', 'stats'], array_keys($response->json()));
        $this->getJson('/api/gacha/sync-status')->assertExactJson($response->json('stats'));
        $parent = SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->sole();
        $this->assertSame(SyncRun::STATUS_SUCCESS, $parent->status);
        $this->assertNull($parent->parent_id);
        $this->assertNotNull($parent->started_at);
        $this->assertNotNull($parent->finished_at);
        $this->assertGreaterThanOrEqual($parent->started_at, $parent->finished_at);
        $this->assertNull($parent->created_count);
        $this->assertNull($parent->updated_count);
        $this->assertSame(0, $parent->unresolved_count);
        $this->assertSame(0, $parent->warning_count);
        $this->assertSame([
            'force' => false, 'allow_evolution_removals' => false, 'is_up_to_date' => false,
            'manifest_changed' => true, 'mode' => 'full', 'characters_processed' => 1,
            'support_cards_processed' => 1, 'banners_processed' => 1,
        ], $parent->metadata);

        $children = $parent->children->keyBy('source')->sortKeys();
        $this->assertSame(['cygames', 'umapyoi'], $children->keys()->all());
        foreach ($children as $child) {
            $this->assertTrue($child->parent->is($parent));
            $this->assertSame(SyncRun::TRIGGER_EMBEDDED, $child->trigger);
            $this->assertSame(SyncRun::STATUS_SUCCESS, $child->status);
            $this->assertNotNull($child->finished_at);
        }
        $this->assertSame(true, $children['cygames']->metadata['index_fetch_ok']);
        $this->assertSame(0, $children['cygames']->updated_count);
        $this->assertSame([
            'search_request_ok' => true, 'articles_seen' => 1, 'detail_requests' => 1,
            'detail_failures' => 0, 'lineup_failures' => 0, 'lineups_found' => 1,
        ], $children['umapyoi']->metadata);
        $this->assertSame(['Tokai Teio [Official]'], GachaBanner::where('gametora_id', 30490)->sole()->featured_items);
    }

    #[TestWith([200, SyncRun::STATUS_SUCCESS, SyncRun::STATUS_SUCCESS])]
    #[TestWith([503, SyncRun::STATUS_DEGRADED, SyncRun::STATUS_FAILED])]
    public function test_cached_sync_records_current_cygames_health_without_fetching_umapyoi_again(int $statusCode, string $parentStatus, string $childStatus): void
    {
        $this->fakeGameTora([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::sequence()
                ->push(['information_list' => []])
                ->push(['information_list' => []], $statusCode),
        ]);
        $this->assertTrue(app(GameToraSyncService::class)->sync()['success']);

        $this->postJson('/api/career/sync-gametora')->assertOk()
            ->assertJsonPath('success', true)->assertJsonPath('is_up_to_date', true);

        [$cached, $full] = SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->finished()->latestFirst()->get()->all();
        $this->assertSame(SyncRun::TRIGGER_DIRECT, $full->trigger);
        $this->assertSame(SyncRun::TRIGGER_MANUAL, $cached->trigger);
        $this->assertSame($parentStatus, $cached->status);
        $this->assertSame('cached', $cached->metadata['mode']);
        $this->assertSame(true, $cached->metadata['is_up_to_date']);
        $this->assertSame(false, $cached->metadata['manifest_changed']);
        $this->assertSame($childStatus, $cached->children()->sole()->status);
        $this->assertSame(1, SyncRun::forSource(SyncRun::SOURCE_UMAPYOI)->count());
        $umapyoi = $full->children()->forSource(SyncRun::SOURCE_UMAPYOI)->sole();
        $this->assertSame(SyncRun::STATUS_SUCCESS, $umapyoi->status);
        $this->assertSame(true, $umapyoi->metadata['search_request_ok']);
        $this->assertSame(0, $umapyoi->metadata['lineups_found']);
    }

    #[TestWith(['creating', SyncRun::SOURCE_GAMETORA])]
    #[TestWith(['updating', SyncRun::SOURCE_GAMETORA])]
    #[TestWith(['updating', SyncRun::SOURCE_CYGAMES])]
    #[TestWith(['updating', SyncRun::SOURCE_UMAPYOI])]
    public function test_recorder_failure_at_one_source_preserves_sync_and_other_runs(string $operation, string $source): void
    {
        $this->fakeGameTora([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(null, 503),
            self::UMAPYOI_SEARCH => Http::failedConnection('Controlled upstream failure'),
        ]);
        $event = "eloquent.{$operation}: ".SyncRun::class;
        Event::listen($event, function (SyncRun $run) use ($source): void {
            if ($run->source === $source) {
                throw new RuntimeException('Controlled telemetry write failure');
            }
        });

        try {
            $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('success', true);
        } finally {
            Event::forget($event);
        }

        $this->assertSame(['Special Week [Fallback]'], GachaBanner::where('gametora_id', 30490)->sole()->featured_items);
        $this->assertNotNull(AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
        $runs = SyncRun::all()->keyBy('source');
        $parent = $runs->get(SyncRun::SOURCE_GAMETORA);
        if ($operation === 'creating') {
            $this->assertNull($parent);
        } elseif ($source === SyncRun::SOURCE_GAMETORA) {
            $this->assertNull($parent->finished_at);
        } else {
            $this->assertSame(SyncRun::STATUS_DEGRADED, $parent->status);
            $this->assertSame(2, $parent->warning_count);
        }
        foreach ([SyncRun::SOURCE_CYGAMES, SyncRun::SOURCE_UMAPYOI] as $childSource) {
            $child = $runs->get($childSource);
            $this->assertSame($parent?->id, $child->parent_id);
            $this->assertSame(SyncRun::TRIGGER_EMBEDDED, $child->trigger);
            if ($source === $childSource) {
                $this->assertNull($child->finished_at);
            } else {
                $this->assertNotNull($child->finished_at);
                $this->assertSame(SyncRun::STATUS_FAILED, $child->status);
            }
        }
    }

    public function test_core_gametora_failure_records_terminal_status_and_leaves_checkpoint_intact(): void
    {
        AppSetting::setValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY, 'previous-hash');
        AppSetting::setValue('gametora_last_synced_at', 'previous-time');
        Http::fake([GameToraSyncService::MANIFEST_URL => Http::response(['message' => 'upstream is unavailable'], 503)]);

        $this->postJson('/api/gacha/sync-gametora')->assertStatus(500)
            ->assertJsonPath('success', false)->assertJsonPath('is_up_to_date', false);

        $run = SyncRun::sole();
        $this->assertSame(SyncRun::STATUS_FAILED, $run->status);
        $this->assertNotNull($run->finished_at);
        $this->assertSame('Permintaan sumber gagal (HTTP 503).', $run->error_summary);
        $this->assertSame('previous-hash', AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
        $this->assertSame('previous-time', AppSetting::getValue('gametora_last_synced_at'));
    }

    public function test_recorder_saves_only_normalized_errors_and_small_diagnostic_metadata(): void
    {
        $run = SyncRunRecorder::start(SyncRun::SOURCE_GAMETORA, SyncRun::TRIGGER_DIRECT, metadata: [
            'force' => true,
            'mode' => 'C:\\secret\\ca.pem',
            'request_headers' => 'Authorization: Bearer sample-token',
        ]);
        $run->finish(
            SyncRun::STATUS_FAILED,
            ['banners_processed' => 9],
            updatedCount: 2,
            unresolvedCount: 1,
            warningCount: 1,
            error: new ConnectionException('cURL error 60: C:\\secret\\ca.pem https://example.test/data?token=sample-token '.str_repeat('<html>raw body</html>', 90)),
        );

        $saved = SyncRun::finished()->sole();
        $this->assertSame('Verifikasi sertifikat TLS gagal.', $saved->error_summary);
        $this->assertSame(['force' => true, 'banners_processed' => 9], $saved->metadata);
        $this->assertSame(2, $saved->updated_count);
        $this->assertSame(1, $saved->unresolved_count);
        $this->assertSame(1, $saved->warning_count);
    }

    #[TestWith(['creating', 0])]
    #[TestWith(['updating', 3])]
    public function test_actual_sync_succeeds_even_when_telemetry_insert_or_update_throws(string $operation, int $unfinishedCount): void
    {
        $this->fakeGameTora();
        $event = "eloquent.{$operation}: ".SyncRun::class;
        Event::listen($event, fn () => throw new RuntimeException('Controlled telemetry write failure'));

        try {
            $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('success', true);
        } finally {
            Event::forget($event);
        }

        $this->assertNotNull(AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
        $this->assertSame(['Special Week [Fallback]'], GachaBanner::where('gametora_id', 30490)->sole()->featured_items);
        $this->assertDatabaseCount('sync_runs', $unfinishedCount);
        $this->assertSame(0, SyncRun::finished()->count());
    }

    #[TestWith([503, 0, SyncRun::STATUS_FAILED, 'Special Week [Fallback]'])]
    #[TestWith([200, 2, SyncRun::STATUS_DEGRADED, 'Tokai Teio [Official]'])]
    public function test_optional_umapyoi_failure_degrades_parent_and_preserves_existing_fallback(int $searchCode, int $details, string $status, string $featured): void
    {
        $this->fakeGameTora([
            self::UMAPYOI_SEARCH => Http::response([$this->twinkleArticle(1), $this->twinkleArticle(2)], $searchCode),
            self::UMAPYOI_NEWS.'1' => Http::response(null, 503),
            self::UMAPYOI_NEWS.'2' => Http::response($this->twinkleDetail()),
        ]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()
            ->assertJsonPath('success', true)->assertJsonPath('is_up_to_date', false);

        $parent = SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->sole();
        $child = $parent->children()->forSource(SyncRun::SOURCE_UMAPYOI)->sole();
        $this->assertSame(SyncRun::STATUS_DEGRADED, $parent->status);
        $this->assertSame(1, $parent->warning_count);
        $this->assertSame($status, $child->status);
        $this->assertSame($details, $child->metadata['detail_requests']);
        $this->assertSame((int) ($details > 0), $child->metadata['detail_failures']);
        $this->assertSame((int) ($details > 0), $child->metadata['lineups_found']);
        $this->assertSame([$featured], GachaBanner::where('gametora_id', 30490)->sole()->featured_items);
    }

    #[TestWith([200, 200, false, SyncRun::STATUS_SUCCESS])]
    #[TestWith([503, 200, true, SyncRun::STATUS_DEGRADED])]
    #[TestWith([503, 503, false, SyncRun::STATUS_FAILED])]
    public function test_direct_cygames_run_classifies_official_updates_and_archive_recovery(int $indexCode, int $detailCode, bool $missingBanner, string $status): void
    {
        $service = app(CygamesNewsService::class);
        [$article, $expected] = $this->seedArchivedArticle();
        if ($missingBanner) {
            AppSetting::setValue('cygames_article_processed_3547', '1');
        } else {
            GachaBanner::create([
                'gametora_id' => 30485, 'banner_type' => 'support_card', 'category' => 'select_rate_up',
                'name' => 'Select Pick Up (Nov 2026)', 'start_date' => '2026-11-16', 'featured_items' => [],
            ]);
        }
        $olderLineup = UmaCatalog::getSelectPickupCandidates2026()['2026-10-13']['candidates'];
        $older = GachaBanner::create([
            'gametora_id' => 30477, 'banner_type' => 'support_card', 'category' => 'select_rate_up',
            'name' => 'Select Pick Up (Oct 2026)', 'start_date' => '2026-10-13', 'featured_items' => $olderLineup,
        ]);
        AppSetting::setValue('select_pickup_provenance_30477', CygamesNewsService::NEWS_WEB_BASE_URL.'3490');
        Http::fake([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(['information_list' => [$article]], $indexCode),
            CygamesNewsService::NEWS_DETAIL_URL.'*announce_id=3547' => Http::response(['detail' => $article], $detailCode),
        ]);

        $result = $service->syncSelectPickupBanners();

        $healed = $detailCode === 200;
        $this->assertSame(['success' => $healed, 'updated_count' => (int) $healed, 'articles_processed' => (int) $healed], $result);
        $run = SyncRun::finished()->sole();
        $this->assertSame(SyncRun::SOURCE_CYGAMES, $run->source);
        $this->assertSame(SyncRun::TRIGGER_DIRECT, $run->trigger);
        $this->assertNull($run->parent_id);
        $this->assertSame($status, $run->status);
        $this->assertSame((int) $missingBanner, $run->created_count);
        $this->assertSame((int) ($healed && ! $missingBanner), $run->updated_count);
        $this->assertSame((int) ! $healed, $run->unresolved_count);
        $this->assertSame($indexCode === 200, $run->metadata['index_fetch_ok']);
        $this->assertSame((int) ! $healed, $run->metadata['detail_fetch_failures']);
        $this->assertSame($healed ? $expected : [], GachaBanner::where('gametora_id', 30485)->sole()->featured_items);
        $this->assertSame($olderLineup, $older->refresh()->featured_items);
    }

    public function test_gametora_recovers_current_health_after_cygames_archive_fallback(): void
    {
        [$article, $expected] = $this->seedArchivedArticle();
        AppSetting::setValue('cygames_article_processed_3547', '1');
        $this->fakeGameTora([
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::sequence()
                ->push(null, 503)
                ->push(['information_list' => [$article]]),
            CygamesNewsService::NEWS_DETAIL_URL.'*announce_id=3547' => Http::response(['detail' => $article]),
        ]);
        $health = app(DataHealthService::class);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('success', true);

        $degraded = SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->sole();
        $this->assertSame(SyncRun::STATUS_DEGRADED, $degraded->status);
        $this->assertSame(SyncRun::STATUS_DEGRADED, $degraded->children()->forSource(SyncRun::SOURCE_CYGAMES)->sole()->status);
        $this->assertSame($expected, GachaBanner::where('gametora_id', 30485)->sole()->featured_items);
        $this->assertSame('degraded', $health->snapshot()['overall_status']);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()
            ->assertJsonPath('success', true)->assertJsonPath('is_up_to_date', true);

        $latest = SyncRun::forSource(SyncRun::SOURCE_GAMETORA)->latestFirst()->firstOrFail();
        $this->assertSame(SyncRun::STATUS_SUCCESS, $latest->status);
        $cygames = $latest->children()->sole();
        $this->assertSame(SyncRun::SOURCE_CYGAMES, $cygames->source);
        $this->assertSame(SyncRun::STATUS_SUCCESS, $cygames->status);
        $this->assertSame('healthy', $health->snapshot()['overall_status']);
        $this->assertSame(SyncRun::STATUS_DEGRADED, $degraded->refresh()->status);
    }

    /** @return array{array<string, mixed>, list<string>} */
    private function seedArchivedArticle(): array
    {
        $article = json_decode(file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3547.json')), true)['detail'];
        $expected = [];
        foreach (app(CygamesNewsService::class)->parseArticle($article)['raw_candidates'] as $candidate) {
            $name = "SSR [{$candidate['title']}] {$candidate['character']}";
            $expected[] = $name;
            UmaCatalogItem::create([
                'type' => 'support_card', 'name' => $name, 'rarity' => 'SSR', 'raw_data' => ['title_ja' => $candidate['title']],
            ]);
        }

        return [$article, $expected];
    }

    public function test_backup_export_excludes_telemetry_and_overwrite_keeps_machine_local_history(): void
    {
        $run = SyncRun::factory()->create();
        $backup = $this->getJson('/api/backup/export?download=0')->assertOk()->assertJsonPath('version', '2.0')->json();
        $this->assertArrayNotHasKey('sync_runs', $backup['summary']);
        $this->assertArrayNotHasKey('sync_runs', $backup['data']);

        $this->postJson('/api/backup/import', ['mode' => 'overwrite', 'data' => $backup])->assertOk();

        $this->assertModelExists($run);
        $this->assertDatabaseCount('sync_runs', 1);
    }

    public function test_overwrite_restore_invalidates_health_until_next_successful_sync(): void
    {
        $specialRevision = 'older';
        $this->fakeGameTora([
            GameToraSyncService::MANIFEST_URL => function () use (&$specialRevision) {
                return Http::response(array_replace($this->manifest(), ['gacha/special' => $specialRevision]));
            },
            GameToraSyncService::DATA_BASE_URL.'/gacha/special.older.json' => Http::response([
                ['id' => 30490, 'start' => strtotime('2026-09-02'), 'end' => strtotime('2026-09-12'), 'lineup' => [3750 => [100101]]],
            ]),
            GameToraSyncService::DATA_BASE_URL.'/gacha/special.current.json' => Http::response([
                ['id' => 30490, 'start' => strtotime('2026-09-02'), 'end' => strtotime('2026-09-19'), 'lineup' => [3750 => [100101]]],
            ]),
        ]);
        $health = app(DataHealthService::class);
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('success', true);
        $olderBackup = $this->getJson('/api/backup/export?download=0')->assertOk()->assertJsonPath('version', '2.0')->json();
        $specialRevision = 'current';
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $checkpoint = AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY);
        $beforeRestore = $health->snapshot();
        $historyCount = SyncRun::count();
        $this->assertSame('healthy', $beforeRestore['overall_status']);
        $this->assertSame('2026-09-19', GachaBanner::where('gametora_id', 30490)->sole()->end_date->toDateString());

        $this->postJson('/api/backup/import', ['mode' => 'overwrite', 'data' => $olderBackup])->assertOk();
        $afterRestore = $health->snapshot();

        $this->assertSame('2026-09-12', GachaBanner::where('gametora_id', 30490)->sole()->end_date->toDateString());
        $this->assertNull(AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
        $this->assertSame($historyCount, SyncRun::count());
        $this->assertSame($beforeRestore['sources'], $afterRestore['sources']);
        $this->assertSame(0, $afterRestore['issues']['unresolved_select_pickup_count']);
        $this->assertSame('degraded', $afterRestore['overall_status']);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertSame($checkpoint, AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
        $this->assertSame('healthy', $health->snapshot()['overall_status']);
        $this->assertSame('2026-09-19', GachaBanner::where('gametora_id', 30490)->sole()->end_date->toDateString());
        $this->assertSame(SyncRun::STATUS_SUCCESS, SyncRun::findOrFail($beforeRestore['sources']['gametora']['last_run_id'])->status);
    }

    /** @return array<string, string> */
    private function manifest(): array
    {
        return ['character-cards' => 'cards', 'characters' => 'bases', 'support-cards' => 'supports', 'gacha/special' => 'special'];
    }

    /** @param array<string, mixed> $responses */
    private function fakeGameTora(array $responses = []): void
    {
        $base = GameToraSyncService::DATA_BASE_URL;
        Http::fake($responses + [
            GameToraSyncService::MANIFEST_URL => Http::response($this->manifest()),
            $base.'/character-cards.cards.json' => Http::response([
                ['card_id' => 100101, 'name_en' => 'Special Week', 'title_en' => 'Fallback'],
            ]),
            $base.'/characters.bases.json' => Http::response([]),
            $base.'/support-cards.supports.json' => Http::response([
                ['support_id' => 40001, 'id' => 40001, 'char_name' => 'Special Week', 'rarity' => 3, 'type' => 'speed', 'title_ja' => '[Support]'],
            ]),
            $base.'/gacha/special.special.json' => Http::response([
                ['id' => 30490, 'start' => strtotime('2026-09-02'), 'lineup' => [3750 => [100101]]],
            ]),
            CygamesNewsService::NEWS_INDEX_URL.'*' => Http::response(['information_list' => []]),
            self::UMAPYOI_SEARCH => Http::response([]),
        ]);
    }

    /** @return array{announce_id: int, title: string, post_at: int} */
    private function twinkleArticle(int $id): array
    {
        return ['announce_id' => $id, 'title' => 'Twinkle Collection', 'post_at' => strtotime('2026-09-02')];
    }

    /** @return array{message_english: string} */
    private function twinkleDetail(): array
    {
        return ['message_english' => '<img src="gacha_banner_30490.png">■ Eligible Umamusume<br>★★★ [Official] Tokai Teio<br>■'];
    }
}
