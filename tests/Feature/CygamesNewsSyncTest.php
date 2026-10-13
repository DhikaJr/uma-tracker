<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\UmaCatalogItem;
use App\Services\CygamesNewsService;
use App\Services\GameToraSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CygamesNewsSyncTest extends TestCase
{
    use RefreshDatabase;

    protected CygamesNewsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CygamesNewsService;

        // Seed 10 canonical support cards for candidate matching in tests
        $cards = [
            ['name' => 'SSR [永久の誓い、永久の輝き] Satono Diamond (Speed)', 'title_ja' => '永久の誓い、永久の輝き'],
            ['name' => 'SSR [刀光散らしてClash！] Tap Dance City (Speed)', 'title_ja' => '刀光散らしてClash！'],
            ['name' => 'SSR [心覚えし、京の華] Air Groove (Speed)', 'title_ja' => '心覚えし、京の華'],
            ['name' => 'SSR [天才的ユートピア] Tokai Teio (Speed)', 'title_ja' => '天才的ユートピア'],
            ['name' => 'SSR [吉兆招福チョコ来たる] Matikanefukukitaru (Speed)', 'title_ja' => '吉兆招福チョコ来たる'],
            ['name' => 'SSR [賑やかな未来を乗せて走れ！] Sakura Chiyono O (Stamina)', 'title_ja' => '賑やかな未来を乗せて走れ！'],
            ['name' => 'SSR [故郷に錦を飾るんでい！] Inari One (Stamina)', 'title_ja' => '故郷に錦を飾るんでい！'],
            ['name' => 'SSR [気まぐれ渡り星] Stay Gold (Guts)', 'title_ja' => '気まぐれ渡り星'],
            ['name' => 'SSR [Innovator] Forever Young (Intelligence)', 'title_ja' => 'Innovator'],
            ['name' => 'SSR [一杯のノスタルジア] Tazuna Hayakawa (Friend)', 'title_ja' => '一杯のノスタルジア'],
        ];

        foreach ($cards as $c) {
            UmaCatalogItem::create([
                'name' => $c['name'],
                'type' => 'support_card',
                'rarity' => 'SSR',
                'raw_data' => ['title_ja' => $c['title_ja']],
            ]);
        }
    }

    public function test_filter_select_pickup_articles_handles_announcements_and_previews(): void
    {
        $indexJson = file_get_contents(base_path('tests/Fixtures/cygames_news_index.json'));
        $indexData = json_decode($indexJson, true);

        $filtered = $this->service->filterSelectPickupArticles($indexData['information_list']);

        // Expect exactly 2 articles: 3490 (開催) and 3489 (予告)
        $this->assertCount(2, $filtered);

        // Sorted newest announce_id first
        $this->assertSame(3490, $filtered[0]['announce_id']);
        $this->assertSame('育成ウマ娘が新登場！セレクトピックアップサポートカードガチャも開催！', $filtered[0]['title']);

        $this->assertSame(3489, $filtered[1]['announce_id']);
        $this->assertSame('【予告】育成ウマ娘が新登場！セレクトピックアップサポートカードガチャも開催決定！', $filtered[1]['title']);
    }

    public function test_can_parse_article_detail_and_extract_gametora_id_and_10_candidates(): void
    {
        $detailJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json'));
        $detailData = json_decode($detailJson, true);

        $parsed = $this->service->parseArticle($detailData['detail']);

        $this->assertNotNull($parsed);
        $this->assertSame(3490, $parsed['announce_id']);
        $this->assertSame(30477, $parsed['gametora_id']);
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $parsed['provenance_url']);
        $this->assertSame('2026-10-13', $parsed['start_date']);
        $this->assertSame('2026-10-26', $parsed['end_date']);
        $this->assertCount(10, $parsed['raw_candidates']);

        $this->assertSame('永久の誓い、永久の輝き', $parsed['raw_candidates'][0]['title']);
        $this->assertSame('サトノダイヤモンド', $parsed['raw_candidates'][0]['character']);
        $this->assertSame('刀光散らしてClash！', $parsed['raw_candidates'][1]['title']);
        $this->assertSame('タップダンスシチー', $parsed['raw_candidates'][1]['character']);
    }

    public function test_can_resolve_candidates_against_catalog_with_punctuation_normalization(): void
    {
        $detailJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json'));
        $detailData = json_decode($detailJson, true);

        $parsed = $this->service->parseArticle($detailData['detail']);
        $this->assertNotNull($parsed);

        $resolved = $this->service->resolveCandidates($parsed['raw_candidates']);

        $this->assertNotNull($resolved);
        $this->assertCount(10, $resolved);

        $expected = [
            'SSR [永久の誓い、永久の輝き] Satono Diamond (Speed)',
            'SSR [刀光散らしてClash！] Tap Dance City (Speed)',
            'SSR [心覚えし、京の華] Air Groove (Speed)',
            'SSR [天才的ユートピア] Tokai Teio (Speed)',
            'SSR [吉兆招福チョコ来たる] Matikanefukukitaru (Speed)',
            'SSR [賑やかな未来を乗せて走れ！] Sakura Chiyono O (Stamina)',
            'SSR [故郷に錦を飾るんでい！] Inari One (Stamina)',
            'SSR [気まぐれ渡り星] Stay Gold (Guts)',
            'SSR [Innovator] Forever Young (Intelligence)',
            'SSR [一杯のノスタルジア] Tazuna Hayakawa (Friend)',
        ];

        $this->assertSame($expected, $resolved);
    }

    public function test_rejects_corrupted_html_or_missing_candidate_section(): void
    {
        $corruptDetail = [
            'announce_id' => 9999,
            'title' => 'セレクトピックアップ サポートカードガチャ',
            'message' => '<h2>開催期間</h2>10/13 ～ 10/26<br><p>Tidak ada kandidat</p>',
        ];

        $parsed = $this->service->parseArticle($corruptDetail);
        $this->assertNull($parsed);
    }

    public function test_rejects_candidate_list_with_fewer_or_more_than_10_items(): void
    {
        $incompleteMessage = '<h2>開催期間</h2>10/13 ～ 10/26<br>■ピックアップサポートカード候補<br>・SSR [永久の誓い、永久の輝き]サトノダイヤモンド<br>';
        $detail = [
            'announce_id' => 9999,
            'title' => 'セレクトピックアップ サポートカードガチャ',
            'message' => $incompleteMessage,
        ];

        $parsed = $this->service->parseArticle($detail);
        $this->assertNull($parsed);
    }

    public function test_rejects_unknown_cards_and_never_overwrites_existing_banner(): void
    {
        $banner = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => ['SSR [Original Safe Card] Uma'],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        $rawWithUnknown = [
            ['title' => 'Unknown Card Title', 'character' => 'Unknown Character'],
            ['title' => '永久の誓い、永久の輝き', 'character' => 'サトノダイヤモンド'],
            ['title' => '刀光散らしてClash！', 'character' => 'タップダンスシチー'],
            ['title' => '心覚えし、京の華', 'character' => 'エアグルーヴ'],
            ['title' => '天才的ユートピア', 'character' => 'トウカイテイオー'],
            ['title' => '吉兆招福チョコ来たる', 'character' => 'マチカネフクキタル'],
            ['title' => '賑やかな未来を乗せて走れ！', 'character' => 'サクラチヨノオー'],
            ['title' => '故郷に錦を飾るんでい！', 'character' => 'イナリワン'],
            ['title' => '気まぐれ渡り星', 'character' => 'ステイゴールド'],
            ['title' => 'Innovator', 'character' => 'フォーエバーヤング'],
        ];

        $resolved = $this->service->resolveCandidates($rawWithUnknown);
        $this->assertNull($resolved);

        // Verify existing banner items were untouched
        $banner->refresh();
        $this->assertSame(['SSR [Original Safe Card] Uma'], $banner->featured_items);
    }

    public function test_sync_select_pickup_banners_updates_database_and_records_provenance(): void
    {
        $indexJson = file_get_contents(base_path('tests/Fixtures/cygames_news_index.json'));
        $detailJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json'));

        Http::fake([
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response($indexJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*' => Http::response($detailJson, 200),
        ]);

        // Pre-create banner to simulate GameTora existing banner
        $banner = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => [],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        $res = $this->service->syncSelectPickupBanners(true);

        $this->assertTrue($res['success']);
        $this->assertSame(1, $res['updated_count']);

        $banner->refresh();
        $this->assertCount(10, $banner->featured_items);
        $this->assertSame('SSR [永久の誓い、永久の輝き] Satono Diamond (Speed)', $banner->featured_items[0]);
        $this->assertSame('SSR [一杯のノスタルジア] Tazuna Hayakawa (Friend)', $banner->featured_items[9]);

        // Check provenance URL
        $provenance = $banner->getProvenanceUrl();
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $provenance);
        $this->assertSame('3490', AppSetting::getValue('last_processed_cygames_announce_id'));
    }

    public function test_can_parse_preview_article_fixture_3489(): void
    {
        $previewJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3489_preview.json'));
        $previewData = json_decode($previewJson, true);

        $parsed = $this->service->parseArticle($previewData['detail']);

        $this->assertNotNull($parsed);
        $this->assertSame(3489, $parsed['announce_id']);
        $this->assertSame(30477, $parsed['gametora_id']);
        $this->assertSame('https://umamusume.jp/news/detail?id=3489', $parsed['provenance_url']);
        $this->assertSame('2026-10-13', $parsed['start_date']);
        $this->assertSame('2026-10-26', $parsed['end_date']);
        $this->assertCount(10, $parsed['raw_candidates']);

        $resolved = $this->service->resolveCandidates($parsed['raw_candidates']);
        $this->assertNotNull($resolved);
        $this->assertCount(10, $resolved);
        $this->assertSame('SSR [永久の誓い、永久の輝き] Satono Diamond (Speed)', $resolved[0]);
    }

    public function test_commencement_announcement_takes_precedence_over_older_preview_and_avoids_redundant_sync(): void
    {
        $indexJson = file_get_contents(base_path('tests/Fixtures/cygames_news_index.json'));
        $detailJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json'));
        $previewJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3489_preview.json'));

        Http::fake([
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response($indexJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*announce_id=3489*' => Http::response($previewJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*announce_id=3490*' => Http::response($detailJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*' => Http::response($detailJson, 200),
        ]);

        $banner = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => [],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        // 1. First run (normal sync, not forced):
        // Index contains both 3490 (開催) and 3489 (予告).
        // 3490 is processed first, updating the banner.
        // 3489 is evaluated next, but provenance precedence prevents 3489 from overwriting 3490.
        $firstRes = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($firstRes['success']);
        $this->assertSame(1, $firstRes['updated_count']);

        $banner->refresh();
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $banner->getProvenanceUrl());
        $this->assertSame('3490', AppSetting::getValue('last_processed_cygames_announce_id'));

        // 2. Second run without force:
        // Because last_processed_cygames_announce_id is 3490, all articles <= 3490 are skipped.
        // Zero detail HTTP calls made; zero redundant updates.
        $secondRes = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($secondRes['success']);
        $this->assertSame(0, $secondRes['articles_processed']);
        $this->assertSame(0, $secondRes['updated_count']);
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $banner->fresh()->getProvenanceUrl());

        // 3. Third run with force:
        // Even when forced, older preview 3489 NEVER overwrites provenance or candidate lineup of 3490.
        $forcedRes = $this->service->syncSelectPickupBanners(true);
        $this->assertTrue($forcedRes['success']);
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $banner->fresh()->getProvenanceUrl());
    }

    public function test_sync_retains_fallback_when_cygames_network_fails(): void
    {
        Http::fake([
            'https://umamusume.jp/*' => Http::response(null, 500),
        ]);

        $banner = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => ['SSR [Safe Fallback] Item'],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        $res = $this->service->syncSelectPickupBanners(true);

        $this->assertFalse($res['success']);
        $banner->refresh();
        $this->assertSame(['SSR [Safe Fallback] Item'], $banner->featured_items);
    }

    public function test_gametora_sync_service_triggers_cygames_news_update(): void
    {
        $indexJson = file_get_contents(base_path('tests/Fixtures/cygames_news_index.json'));
        $detailJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json'));

        Http::fake([
            'https://gametora.com/data/manifests/umamusume.json' => Http::response([
                'character-cards' => 'hash1',
                'characters' => 'hash2',
                'support-cards' => 'hash3',
                'skills' => 'hash4',
                'gacha/char-standard' => 'hash5',
                'gacha/support-standard' => 'hash6',
                'gacha/special' => 'hash7',
                'gacha/char_banners' => 'hash8',
                'gacha/support_banners' => 'hash9',
                'racetracks' => 'hash10',
                'racetracks_extended' => 'hash11',
            ], 200),
            'https://gametora.com/data/umamusume/character-cards.hash1.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/characters.hash2.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/support-cards.hash3.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/skills.hash4.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/gacha/support_banners.hash9.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/gacha/char_banners.hash8.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/racetracks.hash10.json' => Http::response([], 200),
            'https://gametora.com/data/umamusume/racetracks_extended.hash11.json' => Http::response([], 200),
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response($indexJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*' => Http::response($detailJson, 200),
        ]);

        $syncService = app(GameToraSyncService::class);
        $result = $syncService->sync(true);

        $this->assertTrue($result['success']);

        $banner = GachaBanner::where('gametora_id', 30477)->first();
        $this->assertNotNull($banner);
        $this->assertSame('select_rate_up', $banner->category);
        $this->assertCount(10, $banner->featured_items);
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $banner->getProvenanceUrl());
    }

    public function test_article_detail_failure_on_first_sync_is_retried_and_saved_on_second_sync(): void
    {
        $indexJson = file_get_contents(base_path('tests/Fixtures/cygames_news_index.json'));
        $detailJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json'));

        $banner = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => ['SSR [Safe Fallback] Item'],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        // Setup sequence: Run 1 fails with 500, Run 2 succeeds with 200 payload
        Http::fake([
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response($indexJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*' => Http::sequence()
                ->pushResponse(Http::response(null, 500))
                ->pushResponse(Http::response(null, 500))
                ->pushResponse(Http::response($detailJson, 200))
                ->pushResponse(Http::response($detailJson, 200)),
        ]);

        $firstRes = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($firstRes['success']);
        $this->assertSame(0, $firstRes['updated_count']);

        // Checkpoint must NOT be marked as completed
        $this->assertNull(AppSetting::getValue('last_processed_cygames_announce_id'));
        $this->assertSame(['SSR [Safe Fallback] Item'], $banner->fresh()->featured_items);

        // Run 2: Detail request now succeeds with valid payload from the sequence
        $secondRes = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($secondRes['success']);
        $this->assertSame(1, $secondRes['updated_count']);

        // Checkpoint is now recorded and banner items updated
        $this->assertSame('3490', AppSetting::getValue('last_processed_cygames_announce_id'));
        $this->assertCount(10, $banner->fresh()->featured_items);
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $banner->fresh()->getProvenanceUrl());
    }

    public function test_failure_on_one_article_does_not_block_processing_of_other_valid_articles(): void
    {
        $indexJson = file_get_contents(base_path('tests/Fixtures/cygames_news_index.json'));
        $previewJson = file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3489_preview.json'));

        $banner = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => [],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        // Announce 3490 fails, but 3489 succeeds
        Http::fake([
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response($indexJson, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*announce_id=3490*' => Http::response(null, 500),
            'https://umamusume.jp/api/ajax/pr_info_detail*announce_id=3489*' => Http::response($previewJson, 200),
        ]);

        $res = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($res['success']);
        $this->assertSame(1, $res['updated_count']);

        // Checkpoint records 3489 since it succeeded, leaving 3490 available for retry
        $this->assertSame('3489', AppSetting::getValue('last_processed_cygames_announce_id'));
        $this->assertCount(10, $banner->fresh()->featured_items);
        $this->assertSame('https://umamusume.jp/news/detail?id=3489', $banner->fresh()->getProvenanceUrl());
    }

    public function test_failed_article_is_retried_even_if_higher_id_article_succeeded_on_different_banner(): void
    {
        $bannerA = GachaBanner::create([
            'gametora_id' => 30477,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Oct 2026)',
            'featured_items' => [],
            'start_date' => '2026-10-13',
            'end_date' => '2026-10-26',
        ]);

        $bannerB = GachaBanner::create([
            'gametora_id' => 30478,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Nov 2026)',
            'featured_items' => [],
            'start_date' => '2026-11-13',
            'end_date' => '2026-11-26',
        ]);

        $indexData = [
            'information_list' => [
                [
                    'announce_id' => 3491,
                    'title' => '育成ウマ娘が新登場！セレクトピックアップサポートカードガチャも開催！',
                    'post_at' => '2026-11-13 12:00:00',
                ],
                [
                    'announce_id' => 3490,
                    'title' => '育成ウマ娘が新登場！セレクトピックアップサポートカードガチャも開催！',
                    'post_at' => '2026-10-13 12:00:00',
                ],
            ],
        ];

        $detailA = json_decode(file_get_contents(base_path('tests/Fixtures/cygames_select_pickup_3490.json')), true);

        // Build detail for 3491 targeting Banner B (30478)
        $detailB = $detailA;
        $detailB['detail']['announce_id'] = 3491;
        $detailB['detail']['message'] = str_replace(
            ['gacha_banner_30477.png', '10/13', '10/26'],
            ['gacha_banner_30478.png', '11/13', '11/26'],
            $detailA['detail']['message']
        );

        $seq3490 = Http::sequence()
            ->pushResponse(Http::response(null, 500))
            ->pushResponse(Http::response($detailA, 200));

        $called3491Count = 0;

        Http::fake([
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response($indexData, 200),
            'https://umamusume.jp/api/ajax/pr_info_detail*announce_id=3491*' => function () use (&$called3491Count, $detailB) {
                $called3491Count++;
                if ($called3491Count > 1) {
                    $this->fail('Article 3491 should have been skipped on second sync as it was already processed.');
                }

                return Http::response($detailB, 200);
            },
            'https://umamusume.jp/api/ajax/pr_info_detail*announce_id=3490*' => $seq3490,
        ]);

        $firstRes = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($firstRes['success']);
        $this->assertSame(1, $firstRes['updated_count']);

        // Banner B is updated with 10 cards and provenance 3491
        $this->assertCount(10, $bannerB->fresh()->featured_items);
        $this->assertSame('https://umamusume.jp/news/detail?id=3491', $bannerB->fresh()->getProvenanceUrl());
        $this->assertTrue($this->service->isArticleProcessed(3491));

        // Banner A remains untouched (not updated) and 3490 is NOT marked processed
        $this->assertEmpty($bannerA->fresh()->featured_items);
        $this->assertNull($bannerA->fresh()->getProvenanceUrl());
        $this->assertFalse($this->service->isArticleProcessed(3490));

        // Checkpoint telemetries highest processed announce ID is 3491
        $this->assertSame('3491', AppSetting::getValue('last_processed_cygames_announce_id'));

        // Run 2 (without force!):
        // Article 3491 is already processed, so it must be skipped.
        // Article 3490 must be retried and now succeeds!

        $secondRes = $this->service->syncSelectPickupBanners(false);
        $this->assertTrue($secondRes['success']);
        $this->assertSame(1, $secondRes['updated_count']);

        // Banner A is now successfully updated!
        $this->assertCount(10, $bannerA->fresh()->featured_items);
        $this->assertSame('https://umamusume.jp/news/detail?id=3490', $bannerA->fresh()->getProvenanceUrl());
        $this->assertTrue($this->service->isArticleProcessed(3490));

        // Banner B remains intact
        $this->assertCount(10, $bannerB->fresh()->featured_items);
        $this->assertSame('https://umamusume.jp/news/detail?id=3491', $bannerB->fresh()->getProvenanceUrl());
        $this->assertSame(1, $called3491Count);
    }
}
