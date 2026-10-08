<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\CircleSnapshot;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UmaTrackerApiTest extends TestCase
{
    use RefreshDatabase;

    protected GachaBanner $characterBanner;

    protected GachaBanner $supportCardBanner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->characterBanner = GachaBanner::create([
            'banner_type' => 'character',
            'name' => 'Standard Character Banner',
            'category' => 'standard',
            'featured_items' => ['Silence Suzuka', 'Special Week', 'Card 5 (SSR)'],
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_active' => true,
        ]);

        $this->supportCardBanner = GachaBanner::create([
            'banner_type' => 'support_card',
            'name' => 'Standard Support Card Banner',
            'category' => 'standard',
            'featured_items' => ['Kitasan Black', 'Card 10 (SSR)'],
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_active' => true,
        ]);
    }

    public function test_single_gacha_pull_requires_banner_id(): void
    {
        $payload = [
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Silence Suzuka',
            'rarity' => 'SSR',
        ];

        $response = $this->postJson('/api/gacha/pulls', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['gacha_banner_id'])
            ->assertJsonPath('errors.gacha_banner_id.0', 'Kolom Banner JP 2026 wajib dipilih. Tarikan tanpa banner tidak dapat diinput.');
    }

    public function test_batch_gacha_pull_requires_banner_id(): void
    {
        $payload = [
            'banner_type' => 'character',
            'pull_type' => 'multi_10',
            'pulls' => [
                ['item_name' => 'Silence Suzuka', 'rarity' => 'SSR'],
            ],
        ];

        $response = $this->postJson('/api/gacha/pulls/batch', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['gacha_banner_id'])
            ->assertJsonPath('errors.gacha_banner_id.0', 'Kolom Banner JP 2026 wajib dipilih. Tarikan tanpa banner tidak dapat diinput.');
    }

    public function test_dashboard_summary_returns_successful_data(): void
    {
        $response = $this->getJson('/api/dashboard/summary');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'gacha' => ['total_pulls', 'ssr_count', 'ssr_rate', 'base_rate', 'character_pity', 'support_pity', 'spark_target', 'rarity_distribution'],
                'career' => ['total_runs', 'total_fans', 'monthly_fans', 'avg_fans', 'best_run'],
                'active_banners',
                'recent_pulls',
                'recent_runs',
                'fan_trends',
            ]);
    }

    public function test_can_log_single_gacha_pull_and_increment_pity(): void
    {
        $payload = [
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Silence Suzuka',
            'rarity' => 'SSR',
            'is_rate_up' => true,
        ];

        $response = $this->postJson('/api/gacha/pulls', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.item_name', 'Silence Suzuka')
            ->assertJsonPath('data.pity_count_at_pull', 1);

        $this->assertDatabaseHas('gacha_pulls', [
            'item_name' => 'Silence Suzuka',
            'rarity' => 'SSR',
        ]);

        $this->assertEquals(1, GachaPity::forBanner('character', $this->characterBanner->id)->current_pity);
    }

    public function test_can_batch_log_ten_pull_preset(): void
    {
        $payload = [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $this->supportCardBanner->id,
            'pull_type' => 'multi_10',
            'pulls' => [
                ['item_name' => 'Card 1', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 2', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 3', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 4', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 5', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 6', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 7', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 8', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 9', 'rarity' => 'SR', 'is_rate_up' => false],
                ['item_name' => 'Card 10 (SSR)', 'rarity' => 'SSR', 'is_rate_up' => true],
            ],
        ];

        $response = $this->postJson('/api/gacha/pulls/batch', $payload);
        $response->assertStatus(201);
        $this->assertCount(10, $response->json('data'));
        $this->assertEquals(10, GachaPity::forBanner('support_card', $this->supportCardBanner->id)->current_pity);
    }

    public function test_can_batch_log_custom_tickets_with_custom_date(): void
    {
        $payload = [
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'custom_ticket',
            'pulled_at' => '2026-08-10',
            'pulls' => [
                ['item_name' => 'Card 1', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 2', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 3', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'Card 4', 'rarity' => 'SR', 'is_rate_up' => false],
                ['item_name' => 'Card 5 (SSR)', 'rarity' => 'SSR', 'is_rate_up' => true],
            ],
        ];

        $response = $this->postJson('/api/gacha/pulls/batch', $payload);
        $response->assertStatus(201);
        $this->assertCount(5, $response->json('data'));
        $this->assertEquals(5, GachaPity::forBanner('character', $this->characterBanner->id)->current_pity);

        $this->assertDatabaseHas('gacha_pulls', [
            'item_name' => 'Card 5 (SSR)',
            'pull_type' => 'custom_ticket',
            'rarity' => 'SSR',
        ]);

        $this->assertStringContainsString('2026-08-10', (string) $response->json('data.0.pulled_at'));
    }

    public function test_can_log_single_gacha_pull_with_custom_date(): void
    {
        $payload = [
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'ticket',
            'item_name' => 'Tokai Teio',
            'rarity' => 'SSR',
            'is_rate_up' => false,
            'pulled_at' => '2026-07-20',
        ];

        $response = $this->postJson('/api/gacha/pulls', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.item_name', 'Tokai Teio');

        $this->assertStringContainsString('2026-07-20', (string) $response->json('data.pulled_at'));
    }

    public function test_can_reset_gacha_pity(): void
    {
        $pity = GachaPity::forBanner('character');
        $pity->current_pity = 150;
        $pity->save();

        $response = $this->postJson('/api/gacha/reset-pity', ['banner_type' => 'character']);
        $response->assertStatus(200)
            ->assertJsonPath('current_pity', 0);

        $this->assertEquals(0, GachaPity::forBanner('character')->fresh()->current_pity);
    }

    public function test_auto_detects_rate_up_when_logging_pull_matching_banner_featured_items(): void
    {
        $charBanner = GachaBanner::create([
            'gametora_id' => 991,
            'banner_type' => 'character',
            'category' => 'anniversary',
            'name' => '5.5th Half Anniversary: Epiphaneia [Fate\'s Chosen Star]',
            'featured_items' => ['Epiphaneia [Fate\'s Chosen Star]'],
            'start_date' => '2026-08-24',
            'end_date' => '2026-09-04',
            'is_active' => true,
        ]);

        $cardBanner = GachaBanner::create([
            'gametora_id' => 992,
            'banner_type' => 'support_card',
            'category' => 'anniversary',
            'name' => '5.5th Half Anniversary Support: SSR [As if Guided] Efforia & SSR [時に交わる海と空] Mr. C.B.',
            'featured_items' => ['SSR [As if Guided] Efforia', 'SSR [時に交わる海と空] Mr. C.B.'],
            'start_date' => '2026-08-24',
            'end_date' => '2026-09-04',
            'is_active' => true,
        ]);

        // 1. Single pull on character banner without explicit is_rate_up=true
        $resSingle = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $charBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'rarity' => 'SSR',
            'is_rate_up' => false,
            'pulled_at' => '2026-08-25',
        ]);
        $resSingle->assertStatus(201);
        $this->assertTrue((bool) $resSingle->json('data.is_rate_up'));

        // 2. Batch pull on support card banner with Efforia and Mr. C.B. matching rate-up
        $resBatch = $this->postJson('/api/gacha/pulls/batch', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $cardBanner->id,
            'pull_type' => 'multi_10',
            'pulled_at' => '2026-08-25',
            'pulls' => [
                ['item_name' => 'SSR [As if Guided] Efforia (Speed)', 'rarity' => 'SSR', 'is_rate_up' => false],
                ['item_name' => 'R [Tracen Academy] Sweep Tosho (Speed)', 'rarity' => 'R', 'is_rate_up' => false],
                ['item_name' => 'SSR [時に交わる海と空] Mr. C.B. (Speed)', 'rarity' => 'SSR', 'is_rate_up' => false],
                ['item_name' => 'SSR [Dear Mr. C.B.] Mr. C.B. (Intelligence)', 'rarity' => 'SSR', 'is_rate_up' => false],
            ],
        ]);
        $resBatch->assertStatus(201);
        $batchData = $resBatch->json('data');

        // Slot 0 (Efforia rate-up) -> true
        $this->assertTrue((bool) $batchData[0]['is_rate_up']);
        // Slot 1 (Sweep Tosho standard R) -> false
        $this->assertFalse((bool) $batchData[1]['is_rate_up']);
        // Slot 2 (Mr. C.B. rate-up variant) -> true
        $this->assertTrue((bool) $batchData[2]['is_rate_up']);
        // Slot 3 (Mr. C.B. non-rate-up variant) -> false
        $this->assertFalse((bool) $batchData[3]['is_rate_up']);
    }

    public function test_can_record_career_run_with_direct_fans_gained(): void
    {
        $payload = [
            'uma_name' => 'Phalaenopsis',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 35000000,
            'final_rank' => 'UF3',
            'notes' => 'Direct fans gained test',
            'run_date' => '2026-09-15',
        ];

        $response = $this->postJson('/api/career/runs', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.fans_gained', 35000000)
            ->assertJsonPath('data.uma_name', 'Phalaenopsis');

        $this->assertDatabaseHas('career_runs', [
            'uma_name' => 'Phalaenopsis',
            'fans_gained' => 35000000,
            'final_rank' => 'UF3',
        ]);
    }

    public function test_career_run_validation_requires_fans_gained(): void
    {
        $payload = [
            'uma_name' => 'Tokai Teio',
            'scenario' => 'URA Finals',
            'fans_gained' => -100, // Invalid!
            'final_rank' => 'B',
            'run_date' => '2026-09-15',
        ];

        $response = $this->postJson('/api/career/runs', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['fans_gained']);
    }

    public function test_career_metadata_includes_rank_score_thresholds(): void
    {
        $response = $this->getJson('/api/career/metadata');
        $response->assertStatus(200);

        $thresholds = collect($response->json('rank_thresholds'))->keyBy('rank');

        $this->assertTrue($thresholds->has('G'));
        $this->assertSame(0, $thresholds['G']['score']);

        $this->assertTrue($thresholds->has('SS+'));
        $this->assertSame(19200, $thresholds['SS+']['score']);

        $this->assertTrue($thresholds->has('UG'));
        $this->assertSame(19600, $thresholds['UG']['score']);

        $this->assertTrue($thresholds->has('UF'));
        $this->assertSame(23900, $thresholds['UF']['score']);

        $this->assertTrue($thresholds->has('UE'));
        $this->assertSame(28800, $thresholds['UE']['score']);

        $this->assertTrue($thresholds->has('UD'));
        $this->assertSame(34400, $thresholds['UD']['score']);

        $this->assertTrue($thresholds->has('UC'));
        $this->assertSame(40700, $thresholds['UC']['score']);

        $this->assertTrue($thresholds->has('UB'));
        $this->assertSame(47600, $thresholds['UB']['score']);

        $this->assertTrue($thresholds->has('UA'));
        $this->assertSame(55200, $thresholds['UA']['score']);

        $this->assertTrue($thresholds->has('US'));
        $this->assertSame(63400, $thresholds['US']['score']);

        $this->assertTrue($thresholds->has('LG'));
        $this->assertSame(72400, $thresholds['LG']['score']);

        $this->assertTrue($thresholds->has('LG24'));
        $this->assertSame(86800, $thresholds['LG24']['score']);

        $this->assertTrue($thresholds->has('LF'));
        $this->assertSame(91400, $thresholds['LF']['score']);

        $this->assertTrue($thresholds->has('LF20'));
        $this->assertSame(102700, $thresholds['LF20']['score']);

        $this->assertTrue($thresholds->has('LF24'));
        $this->assertSame(104800, $thresholds['LF24']['score']);
    }

    public function test_can_record_career_run_with_evaluation_score_and_auto_select_rank(): void
    {
        // 1. Without final_rank specified, automatically selects UG for 19600
        $response1 = $this->postJson('/api/career/runs', [
            'uma_name' => 'Tokai Teio',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 42000000,
            'evaluation_score' => 19600,
            'run_date' => '2026-09-15',
        ]);

        $response1->assertStatus(201)
            ->assertJsonPath('data.final_rank', 'UG')
            ->assertJsonPath('data.evaluation_score', 19600);

        $this->assertDatabaseHas('career_runs', [
            'uma_name' => 'Tokai Teio',
            'final_rank' => 'UG',
            'evaluation_score' => 19600,
        ]);

        // 2. 19200 automatically selects SS+
        $response2 = $this->postJson('/api/career/runs', [
            'uma_name' => 'Special Week',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 38000000,
            'evaluation_score' => 19200,
            'run_date' => '2026-09-15',
        ]);

        $response2->assertStatus(201)
            ->assertJsonPath('data.final_rank', 'SS+')
            ->assertJsonPath('data.evaluation_score', 19200);

        // 3. User can also explicitly pass rank along with score
        $response3 = $this->postJson('/api/career/runs', [
            'uma_name' => 'Phalaenopsis',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 45000000,
            'evaluation_score' => 20000,
            'final_rank' => 'UG1',
            'run_date' => '2026-09-15',
        ]);

        $response3->assertStatus(201)
            ->assertJsonPath('data.final_rank', 'UG1')
            ->assertJsonPath('data.evaluation_score', 20000);

        // 4. 91400 automatically selects LF
        $response4 = $this->postJson('/api/career/runs', [
            'uma_name' => 'Almond Eye',
            'scenario' => 'Beyond Dreams',
            'fans_gained' => 50000000,
            'evaluation_score' => 91400,
            'run_date' => '2026-09-15',
        ]);

        $response4->assertStatus(201)
            ->assertJsonPath('data.final_rank', 'LF')
            ->assertJsonPath('data.evaluation_score', 91400);

        // 5. 102700 automatically selects LF20
        $response5 = $this->postJson('/api/career/runs', [
            'uma_name' => 'Almond Eye',
            'scenario' => 'Beyond Dreams',
            'fans_gained' => 55000000,
            'evaluation_score' => 102700,
            'run_date' => '2026-09-15',
        ]);

        $response5->assertStatus(201)
            ->assertJsonPath('data.final_rank', 'LF20')
            ->assertJsonPath('data.evaluation_score', 102700);

        // 6. 104800 automatically selects LF24
        $response6 = $this->postJson('/api/career/runs', [
            'uma_name' => 'Almond Eye',
            'scenario' => 'Beyond Dreams',
            'fans_gained' => 60000000,
            'evaluation_score' => 104800,
            'run_date' => '2026-09-15',
        ]);

        $response6->assertStatus(201)
            ->assertJsonPath('data.final_rank', 'LF24')
            ->assertJsonPath('data.evaluation_score', 104800);
    }

    public function test_career_metadata_includes_g_to_lf_ranks_and_new_scenarios(): void
    {
        $response = $this->getJson('/api/career/metadata');
        $response->assertStatus(200);
        $ranks = $response->json('ranks');
        $scenarios = $response->json('scenarios');

        $this->assertContains('G', $ranks);
        $this->assertContains('G+', $ranks);
        $this->assertContains('F', $ranks);
        $this->assertContains('F+', $ranks);
        $this->assertContains('E', $ranks);
        $this->assertContains('UG1', $ranks);
        $this->assertContains('UB1', $ranks);
        $this->assertContains('UA1', $ranks);
        $this->assertContains('US1', $ranks);
        $this->assertContains('LG24', $ranks);
        $this->assertContains('LF', $ranks);
        $this->assertContains('LF20', $ranks);
        $this->assertContains('LF24', $ranks);

        $this->assertContains('The Twinkle Legends', $scenarios);
        $this->assertContains('Design Your Island', $scenarios);
        $this->assertContains('Beyond Dreams', $scenarios);
        $this->assertContains('Yukoma Onsen', $scenarios);
        $this->assertContains('Tracen-ken', $scenarios);

        $umaPresets = $response->json('uma_presets');
        $this->assertContains('Phalaenopsis', $umaPresets);

        $umaOcrMap = $response->json('uma_ocr_map');
        $this->assertIsArray($umaOcrMap);
        $this->assertSame('Oguri Cap', $umaOcrMap['oguri cap'] ?? null);
        $this->assertSame('Oguri Cap', $umaOcrMap['オグリキャップ'] ?? null);
        $this->assertSame('Oguri Cap', $umaOcrMap['starlight beat'] ?? null);
    }

    public function test_gacha_metadata_returns_characters_and_support_cards(): void
    {
        $response = $this->getJson('/api/gacha/metadata');
        $response->assertStatus(200);

        $characters = $response->json('characters');
        $cards = $response->json('support_cards');
        $rarities = $response->json('character_rarities');

        $this->assertContains("Epiphaneia [Fate's Chosen Star]", $characters);
        $this->assertContains('Special Week [Special Dreamer]', $characters);
        $this->assertContains('Tokai Teio [Beyond the Horizon]', $characters);
        $this->assertNotContains('Daiwa Scarlet', $characters);
        $this->assertNotContains('Phalaenopsis', $characters);
        $this->assertContains('SSR [Fire at My Heels] Kitasan Black (Speed)', $cards);
        $this->assertContains('SSR [Piece of Mind] Super Creek (Stamina)', $cards);
        $this->assertSame('SSR', $rarities['Special Week [Special Dreamer]']);
        $this->assertSame('SR', $rarities['Gold Ship [Red Strife]']);
        $this->assertSame('R', $rarities['Haru Urara [Bestest Prize ♪]']);
    }

    public function test_customizable_base_rate_supported_in_stats(): void
    {
        $response = $this->getJson('/api/gacha/stats?base_rate=4.5');
        $response->assertStatus(200)
            ->assertJsonPath('base_rate', 4.5);

        $dashResponse = $this->getJson('/api/dashboard/summary?base_rate=4.5');
        $dashResponse->assertStatus(200)
            ->assertJsonPath('gacha.base_rate', 4.5);
    }

    public function test_settings_endpoint_returns_and_persists_circle_goal_in_database(): void
    {
        // 1. Initial settings check (seeded default 20M)
        $response = $this->getJson('/api/settings');
        $response->assertStatus(200)
            ->assertJsonPath('circle_goal', 20000000)
            ->assertJsonPath('circle_id', '441730573')
            ->assertJsonPath('tracked_viewer_id', '886175385');

        // 2. Update circle_goal to 25M
        $updateResponse = $this->postJson('/api/settings', [
            'circle_goal' => 25000000,
        ]);
        $updateResponse->assertStatus(200)
            ->assertJsonPath('circle_goal', 25000000);

        // 3. Verify database persistence
        $this->assertDatabaseHas('app_settings', [
            'key' => 'circle_goal',
            'value' => '25000000',
        ]);
    }

    public function test_circle_tracker_status_returns_data(): void
    {
        CircleSnapshot::create([
            'circle_id' => '441730573',
            'circle_name' => 'なんか適当',
            'rank' => 986,
            'point' => 1171960184,
            'member_count' => 30,
            'active_total' => 853547402,
            'period' => '2026-09-01',
            'payload' => [
                'contributions' => [
                    'circle' => ['id' => 441730573, 'name' => 'なんか適当', 'memberCount' => 30],
                    'activeTotal' => 853547402,
                    'rows' => [
                        [
                            'rank' => 9,
                            'viewerId' => 886175385,
                            'playerName' => 'u1w0q8n6',
                            'totalFans' => 78465876,
                            'contribution' => 32692179,
                            'todayDelta' => 1632514,
                            'day3Delta' => 5356204,
                            'weekDelta' => 19248574,
                        ],
                    ],
                ],
                'trend' => [
                    'current' => ['rank' => 986, 'point' => 1171960184],
                    'segments' => [],
                ],
            ],
            'last_refreshed_at' => now(),
        ]);

        $response = $this->getJson('/api/circle-tracker/status');
        $response->assertStatus(200)
            ->assertJsonPath('has_data', true)
            ->assertJsonPath('circle_name', 'なんか適当')
            ->assertJsonPath('rank', 986)
            ->assertJsonPath('tracked_player.playerName', 'u1w0q8n6')
            ->assertJsonPath('can_refresh', false);
    }

    public function test_circle_tracker_status_with_historical_period_returns_past_month_data(): void
    {
        CircleSnapshot::create([
            'circle_id' => '441730573',
            'circle_name' => 'なんか適当',
            'rank' => 853,
            'point' => 2075037321,
            'member_count' => 30,
            'active_total' => 2075037321,
            'period' => '2026-09-01',
            'payload' => [
                'contributions' => [
                    'circle' => ['id' => 441730573, 'name' => 'なんか適当', 'memberCount' => 30],
                    'period' => '2026-09-01',
                    'availablePeriods' => ['2026-10-01', '2026-09-01'],
                    'isCurrentPeriod' => false,
                    'activeTotal' => 2075037321,
                    'rows' => [
                        [
                            'rank' => 1,
                            'viewerId' => 886175385,
                            'playerName' => 'u1w0q8n6',
                            'totalFans' => 966130757,
                            'contribution' => 210457263,
                        ],
                    ],
                ],
                'trend' => [],
            ],
            'last_refreshed_at' => now()->subDays(10),
        ]);

        $response = $this->getJson('/api/circle-tracker/status?period=2026-09');
        $response->assertStatus(200)
            ->assertJsonPath('has_data', true)
            ->assertJsonPath('period', '2026-09-01')
            ->assertJsonPath('is_current_period', false)
            ->assertJsonPath('active_total', 2075037321)
            ->assertJsonPath('can_refresh', false)
            ->assertJsonPath('tracked_player.contribution', 210457263);

        $this->assertContains('2026-09-01', $response->json('available_periods'));
    }

    public function test_circle_tracker_refresh_enforces_3_hour_cooldown(): void
    {
        // Snapshot refreshed 30 minutes ago (within 3 hour cooldown window)
        CircleSnapshot::create([
            'circle_id' => '441730573',
            'circle_name' => 'なんか適当',
            'rank' => 986,
            'point' => 1171960184,
            'member_count' => 30,
            'active_total' => 853547402,
            'period' => '2026-09-01',
            'payload' => ['contributions' => ['rows' => []], 'trend' => []],
            'last_refreshed_at' => now()->subMinutes(30),
        ]);

        $response = $this->postJson('/api/circle-tracker/refresh');
        $response->assertStatus(429)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['message', 'data' => ['can_refresh', 'cooldown_seconds_remaining']]);
    }

    public function test_circle_tracker_track_player_updates_setting(): void
    {
        $response = $this->postJson('/api/circle-tracker/track-player', [
            'viewer_id' => '414486880',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('app_settings', [
            'key' => 'tracked_viewer_id',
            'value' => '414486880',
        ]);
    }

    public function test_gacha_sync_status_returns_catalog_counts(): void
    {
        $response = $this->getJson('/api/gacha/sync-status');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'last_synced_at',
                'total_characters',
                'total_support_cards',
                'total_base_umas',
            ]);
    }

    public function test_gacha_sync_catalog_endpoint_updates_database(): void
    {
        Http::fake([
            'https://gametora.com/data/manifests/umamusume.json*' => Http::response([
                'characters' => 'abc111',
                'character-cards' => 'def222',
                'support-cards' => 'ghi333',
            ], 200),
            'https://gametora.com/data/umamusume/characters.abc111.json*' => Http::response([
                ['id' => 101, 'en_name' => 'Special Week'],
                ['id' => 102, 'en_name' => 'Phalaenopsis'],
            ], 200),
            'https://gametora.com/data/umamusume/character-cards.def222.json*' => Http::response([
                ['id' => 1001, 'name_en' => 'Special Week', 'title_en_gl' => 'Special Dreamer', 'rarity' => 3],
                ['id' => 1002, 'name_en' => 'Phalaenopsis', 'title_ja' => '絶佳の暁闇', 'rarity' => 3],
            ], 200),
            'https://gametora.com/data/umamusume/support-cards.ghi333.json*' => Http::response([
                ['id' => 2001, 'char_name' => 'Kitasan Black', 'title_en' => 'Tough Guy', 'rarity' => 3, 'type' => 'Speed'],
            ], 200),
        ]);

        $response = $this->postJson('/api/gacha/sync-catalog', ['force' => true]);
        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('is_up_to_date', false);

        $this->assertDatabaseHas('uma_catalog_items', [
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
        ]);

        $this->assertDatabaseHas('uma_catalog_items', [
            'type' => 'support_card',
            'name' => 'SSR [Tough Guy] Kitasan Black (Speed)',
        ]);

        $metaResponse = $this->getJson('/api/gacha/metadata');
        $metaResponse->assertStatus(200)
            ->assertJsonFragment(['Special Week [Special Dreamer]']);
    }

    public function test_artisan_sync_uma_catalog_command(): void
    {
        Http::fake([
            'https://gametora.com/data/manifests/umamusume.json*' => Http::response([
                'characters' => 'c1',
                'character-cards' => 'c2',
                'support-cards' => 'c3',
            ], 200),
            'https://gametora.com/data/umamusume/characters.c1.json*' => Http::response([
                ['id' => 101, 'en_name' => 'Silence Suzuka'],
            ], 200),
            'https://gametora.com/data/umamusume/character-cards.c2.json*' => Http::response([
                ['id' => 1001, 'name_en' => 'Silence Suzuka', 'title_en_gl' => 'Innocent Silence', 'rarity' => 3],
            ], 200),
            'https://gametora.com/data/umamusume/support-cards.c3.json*' => Http::response([
                ['id' => 2001, 'char_name' => 'Super Creek', 'title_en' => 'Murmuring Stream', 'rarity' => 3, 'type' => 'Stamina'],
            ], 200),
        ]);

        $this->artisan('uma:sync-catalog', ['--force' => true])
            ->assertSuccessful();

        $this->assertDatabaseHas('uma_catalog_items', [
            'name' => 'Silence Suzuka [Innocent Silence]',
        ]);
    }

    public function test_can_list_2026_jp_gacha_banners(): void
    {
        GachaBanner::query()->delete();

        GachaBanner::create([
            'id' => 80001,
            'name' => '5th Anniversary Pretty Derby Gacha (Almond Eye)',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'start_date' => '2026-02-24',
            'end_date' => '2026-03-10',
            'featured_items' => ['Almond Eye [The Changer]'],
            'is_active' => true,
        ]);

        GachaBanner::create([
            'id' => 80002,
            'name' => 'Beyond Dreams Scenario Support Card Gacha',
            'banner_type' => 'support_card',
            'category' => 'scenario_release',
            'start_date' => '2026-02-24',
            'end_date' => '2026-03-10',
            'featured_items' => ['SSR [Beyond Dreams] Scenario Card'],
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/gacha/banners');
        $response->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonFragment(['name' => '5th Anniversary Pretty Derby Gacha (Almond Eye)']);

        $charFilter = $this->getJson('/api/gacha/banners?banner_type=character');
        $charFilter->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.category', 'anniversary');
    }

    public function test_can_log_pull_with_gacha_banner_id(): void
    {
        $banner = GachaBanner::create([
            'id' => 80003,
            'name' => 'Twinkle Collection Gacha (September 2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
            'featured_items' => ['Kitasan Black', 'Satono Diamond'],
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Kitasan Black',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => now()->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.gacha_banner_id', $banner->id);

        $this->assertDatabaseHas('gacha_pulls', [
            'item_name' => 'Kitasan Black',
            'gacha_banner_id' => $banner->id,
        ]);

        // Verify index endpoint returns banner relation
        $listResponse = $this->getJson('/api/gacha/pulls?gacha_banner_id='.$banner->id);
        $listResponse->assertStatus(200)
            ->assertJsonPath('data.0.banner.name', 'Twinkle Collection Gacha (September 2026)');
    }

    public function test_gacha_pull_rejects_future_dates(): void
    {
        $tomorrow = now()->addDay()->toDateString();

        $response = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Oguri Cap',
            'rarity' => 'SSR',
            'pulled_at' => $tomorrow,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['pulled_at']);

        // Batch endpoint should also reject future dates
        $batchResponse = $this->postJson('/api/gacha/pulls/batch', [
            'banner_type' => 'character',
            'pull_type' => 'multi_10',
            'pulled_at' => $tomorrow,
            'pulls' => [
                ['item_name' => 'Card 1', 'rarity' => 'R'],
            ],
        ]);

        $batchResponse->assertStatus(422)
            ->assertJsonValidationErrors(['pulled_at']);
    }

    public function test_career_run_rejects_future_dates(): void
    {
        $tomorrow = now()->addDay()->toDateString();

        $response = $this->postJson('/api/career/runs', [
            'character_name' => 'Tokai Teio',
            'run_date' => $tomorrow,
            'scenario' => 'URA Finals',
            'rank' => 'A',
            'score' => 12000,
            'fans_gained' => 350000,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['run_date']);
    }

    public function test_gacha_stats_separates_standard_3_percent_and_boosted_4_point_5_percent_pools(): void
    {
        $stdBanner = GachaBanner::create([
            'name' => 'Pretty Derby Gacha: Shinko Windy',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.00,
            'start_date' => '2026-01-01',
            'is_active' => true,
        ]);

        $boostBanner = GachaBanner::create([
            'name' => '5.5th Half Anniversary: Epiphaneia',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'start_date' => '2026-08-24',
            'is_active' => true,
        ]);

        // 1 SSR pull on standard banner (100% rate)
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $stdBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Shinko Windy',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pity_count_at_pull' => 1,
            'pulled_at' => now()->toDateString(),
        ]);

        // 10 pulls on boosted banner: 1 SSR, 9 R (10% rate)
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $boostBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Epiphaneia',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pity_count_at_pull' => 2,
            'pulled_at' => now()->toDateString(),
        ]);

        for ($i = 0; $i < 9; $i++) {
            GachaPull::create([
                'banner_type' => 'character',
                'gacha_banner_id' => $boostBanner->id,
                'pull_type' => 'single',
                'item_name' => 'R Item '.$i,
                'rarity' => 'R',
                'is_rate_up' => false,
                'pity_count_at_pull' => 3 + $i,
                'pulled_at' => now()->toDateString(),
            ]);
        }

        // Test combined and separated pools in stats
        $statsResponse = $this->getJson('/api/gacha/stats');
        $statsResponse->assertStatus(200)
            ->assertJsonPath('total_pulls', 11)
            ->assertJsonPath('ssr_count', 2)
            ->assertJsonPath('pools.standard.total_pulls', 1)
            ->assertJsonPath('pools.standard.ssr_count', 1)
            ->assertJsonPath('pools.standard.ssr_rate', 100)
            ->assertJsonPath('pools.standard.base_rate', 3)
            ->assertJsonPath('pools.standard.luck_diff', 97)
            ->assertJsonPath('pools.boosted.total_pulls', 10)
            ->assertJsonPath('pools.boosted.ssr_count', 1)
            ->assertJsonPath('pools.boosted.ssr_rate', 10)
            ->assertJsonPath('pools.boosted.base_rate', 4.5)
            ->assertJsonPath('pools.boosted.luck_diff', 5.5);

        // Test filtering stats by rate_pool=standard
        $stdStats = $this->getJson('/api/gacha/stats?rate_pool=standard');
        $stdStats->assertStatus(200)
            ->assertJsonPath('total_pulls', 1)
            ->assertJsonPath('ssr_count', 1)
            ->assertJsonPath('ssr_rate', 100)
            ->assertJsonPath('base_rate', 3)
            ->assertJsonPath('luck_diff', 97);

        // Test filtering stats by rate_pool=boosted
        $boostStats = $this->getJson('/api/gacha/stats?rate_pool=boosted');
        $boostStats->assertStatus(200)
            ->assertJsonPath('total_pulls', 10)
            ->assertJsonPath('ssr_count', 1)
            ->assertJsonPath('ssr_rate', 10)
            ->assertJsonPath('base_rate', 4.5)
            ->assertJsonPath('luck_diff', 5.5);

        // Test filtering pulls by rate_pool
        $pullsStd = $this->getJson('/api/gacha/pulls?rate_pool=standard');
        $pullsStd->assertStatus(200)
            ->assertJsonPath('total', 1);

        $pullsBoost = $this->getJson('/api/gacha/pulls?rate_pool=boosted');
        $pullsBoost->assertStatus(200)
            ->assertJsonPath('total', 10);

        // Test dashboard summary pools
        $dashResponse = $this->getJson('/api/dashboard/summary');
        $dashResponse->assertStatus(200)
            ->assertJsonPath('gacha.pools.standard.total_pulls', 1)
            ->assertJsonPath('gacha.pools.standard.ssr_rate', 100)
            ->assertJsonPath('gacha.pools.boosted.total_pulls', 10)
            ->assertJsonPath('gacha.pools.boosted.ssr_rate', 10);
    }

    public function test_pity_decreases_when_pull_is_deleted(): void
    {
        $banner = GachaBanner::create([
            'id' => 90001,
            'name' => 'Epiphaneia Pity Test Banner',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'start_date' => '2026-08-24',
            'end_date' => '2026-10-01',
            'featured_items' => ['Epiphaneia'],
            'is_active' => true,
        ]);

        $res1 = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Sakura Bakushin O',
            'rarity' => 'R',
            'pulled_at' => now()->toDateString(),
        ]);
        $pull1Id = $res1->json('data.id');

        $res2 = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Shinko Windy Dummy',
            'rarity' => 'SSR',
            'pulled_at' => now()->toDateString(),
        ]);
        $pull2Id = $res2->json('data.id');

        $this->assertEquals(2, GachaPity::forBanner('character', $banner->id)->current_pity);

        // Delete the dummy pull
        $delResponse = $this->deleteJson("/api/gacha/pulls/{$pull2Id}");
        $delResponse->assertStatus(200)
            ->assertJsonPath('active_pity', 1);

        // Pity count in database must decrease to 1
        $this->assertEquals(1, GachaPity::forBanner('character', $banner->id)->fresh()->current_pity);
    }

    public function test_pity_spark_is_independent_per_banner(): void
    {
        $bannerA = GachaBanner::create([
            'id' => 90002,
            'name' => 'Banner A Epiphaneia',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'start_date' => '2026-08-24',
            'end_date' => '2026-10-01',
            'featured_items' => ['Epiphaneia'],
            'is_active' => true,
        ]);

        $bannerB = GachaBanner::create([
            'id' => 90003,
            'name' => 'Banner B Shinko Windy',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-10',
            'featured_items' => ['Shinko Windy'],
            'is_active' => true,
        ]);

        // Pull 3 times on Banner A
        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/gacha/pulls', [
                'banner_type' => 'character',
                'gacha_banner_id' => $bannerA->id,
                'pull_type' => 'single',
                'item_name' => "Item A {$i}",
                'rarity' => 'R',
                'pulled_at' => now()->toDateString(),
            ]);
        }

        // Pull 1 time on Banner B
        $resB = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $bannerB->id,
            'pull_type' => 'single',
            'item_name' => 'Item B 1',
            'rarity' => 'SSR',
            'pulled_at' => now()->toDateString(),
        ]);
        $pullBId = $resB->json('data.id');

        // Check each banner has its own independent pity
        $this->assertEquals(3, GachaPity::forBanner('character', $bannerA->id)->current_pity);
        $this->assertEquals(1, GachaPity::forBanner('character', $bannerB->id)->current_pity);

        // Deleting pull from Banner B should only affect Banner B
        $this->deleteJson("/api/gacha/pulls/{$pullBId}")->assertStatus(200);

        $this->assertEquals(3, GachaPity::forBanner('character', $bannerA->id)->fresh()->current_pity);
        $this->assertEquals(0, GachaPity::forBanner('character', $bannerB->id)->fresh()->current_pity);
    }

    public function test_can_reset_pity_per_banner(): void
    {
        $banner = GachaBanner::create([
            'id' => 90004,
            'name' => 'Spark Claim Test Banner',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'start_date' => '2026-08-24',
            'end_date' => '2026-10-01',
            'featured_items' => ['Epiphaneia'],
            'is_active' => true,
        ]);

        $pity = GachaPity::forBanner('character', $banner->id);
        $pity->current_pity = 200;
        $pity->save();

        $response = $this->postJson('/api/gacha/reset-pity', [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
        ]);
        $response->assertStatus(200)
            ->assertJsonPath('current_pity', 0)
            ->assertJsonPath('total_sparks', 1);

        $this->assertEquals(0, GachaPity::forBanner('character', $banner->id)->fresh()->current_pity);
        $this->assertEquals(1, GachaPity::forBanner('character', $banner->id)->fresh()->total_sparks);
    }

    public function test_pity_continues_counting_properly_after_reset_spark_even_with_past_banner_date(): void
    {
        $banner = GachaBanner::create([
            'name' => 'Select Pick Up Support Card Gacha',
            'category' => 'select_rate_up',
            'banner_type' => 'support_card',
            'base_rate' => 3.0,
            'start_date' => '2026-09-18',
            'end_date' => '2026-09-30',
            'featured_items' => ['Special Week', 'Silence Suzuka'],
            'is_active' => true,
        ]);

        // 1. Create 200 pulls dated 2026-09-18
        $batch = [];
        for ($i = 1; $i <= 200; $i++) {
            $batch[] = [
                'banner_type' => 'support_card',
                'gacha_banner_id' => $banner->id,
                'pull_type' => 'multi_10',
                'item_name' => 'Support Card Item '.$i,
                'rarity' => 'R',
                'is_rate_up' => false,
                'pity_count_at_pull' => 0,
                'pulled_at' => '2026-09-18 00:00:00',
                'created_at' => now()->subMinute(),
                'updated_at' => now()->subMinute(),
            ];
        }
        GachaPull::insert($batch);

        // Recalculate to verify 200 pulls reach pity 200
        $pityBefore = GachaPity::recalculate('support_card', $banner->id);
        $this->assertEquals(200, $pityBefore);

        // 2. User claims spark / resets pity
        $resetRes = $this->postJson('/api/gacha/reset-pity', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $banner->id,
        ]);
        $resetRes->assertStatus(200)
            ->assertJsonPath('current_pity', 0)
            ->assertJsonPath('total_sparks', 1);

        $this->assertEquals(0, GachaPity::forBanner('support_card', $banner->id)->fresh()->current_pity);

        // 3. User continues pulling 10 more times on the same banner with date 2026-09-18
        $newPullsData = [];
        for ($i = 1; $i <= 10; $i++) {
            $newPullsData[] = [
                'item_name' => 'Post-Reset Card '.$i,
                'rarity' => 'R',
                'is_rate_up' => false,
            ];
        }

        $pullsRes = $this->postJson('/api/gacha/pulls/batch', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'multi_10',
            'pulled_at' => '2026-09-18 00:00:00',
            'pulls' => $newPullsData,
        ]);

        $pullsRes->assertStatus(201);

        // 4. Verify pity count for the 10 new pulls is 1..10, not 0!
        $newPulls = GachaPull::where('item_name', 'like', 'Post-Reset Card%')
            ->orderBy('id', 'asc')
            ->get();

        $this->assertCount(10, $newPulls);
        foreach ($newPulls as $idx => $np) {
            $expectedNumber = $idx + 1;
            $this->assertEquals(
                $expectedNumber,
                $np->pity_count_at_pull,
                "Pull #{$expectedNumber} should have pity_count_at_pull = {$expectedNumber}, got {$np->pity_count_at_pull}"
            );
        }

        // Verify active pity is now 10
        $this->assertEquals(10, GachaPity::forBanner('support_card', $banner->id)->fresh()->current_pity);
        $this->assertEquals(1, GachaPity::forBanner('support_card', $banner->id)->fresh()->total_sparks);
    }

    public function test_can_record_career_run_with_independent_training_type(): void
    {
        $payload = [
            'uma_name' => 'Vodka',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'independent',
            'fans_gained' => 42000000,
            'final_rank' => 'UD1',
            'run_date' => '2026-09-16',
        ];

        $response = $this->postJson('/api/career/runs', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.training_type', 'independent')
            ->assertJsonPath('data.uma_name', 'Vodka');

        $this->assertDatabaseHas('career_runs', [
            'uma_name' => 'Vodka',
            'training_type' => 'independent',
            'fans_gained' => 42000000,
        ]);
    }

    public function test_career_run_defaults_to_manual_training_type(): void
    {
        $payload = [
            'uma_name' => 'Daiwa Scarlet',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 30000000,
            'final_rank' => 'UF5',
            'run_date' => '2026-09-16',
        ];

        $response = $this->postJson('/api/career/runs', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.training_type', 'manual');

        $this->assertDatabaseHas('career_runs', [
            'uma_name' => 'Daiwa Scarlet',
            'training_type' => 'manual',
        ]);
    }

    public function test_career_run_rejects_invalid_training_type(): void
    {
        $payload = [
            'uma_name' => 'Gold Ship',
            'scenario' => 'URA Finals',
            'training_type' => 'super_auto', // Invalid
            'fans_gained' => 20000000,
            'final_rank' => 'A+',
            'run_date' => '2026-09-16',
        ];

        $response = $this->postJson('/api/career/runs', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['training_type']);
    }

    public function test_can_filter_career_runs_by_training_type(): void
    {
        CareerRun::create([
            'uma_name' => 'Special Week',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'manual',
            'fans_gained' => 25000000,
            'final_rank' => 'UG1',
            'run_date' => '2026-09-16',
        ]);

        CareerRun::create([
            'uma_name' => 'Silence Suzuka',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'independent',
            'fans_gained' => 28000000,
            'final_rank' => 'UG5',
            'run_date' => '2026-09-16',
        ]);

        $resManual = $this->getJson('/api/career/runs?training_type=manual');
        $resManual->assertStatus(200);
        $manualNames = collect($resManual->json('data'))->pluck('uma_name');
        $this->assertTrue($manualNames->contains('Special Week'));
        $this->assertFalse($manualNames->contains('Silence Suzuka'));

        $resIndep = $this->getJson('/api/career/runs?training_type=independent');
        $resIndep->assertStatus(200);
        $indepNames = collect($resIndep->json('data'))->pluck('uma_name');
        $this->assertTrue($indepNames->contains('Silence Suzuka'));
        $this->assertFalse($indepNames->contains('Special Week'));
    }

    public function test_pity_counts_are_sequenced_chronologically_by_date_per_banner(): void
    {
        $banner = GachaBanner::create([
            'name' => 'Timeline Pity Test Banner',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.0,
            'start_date' => '2026-08-01',
            'end_date' => '2026-10-01',
        ]);

        // User first logs a pull on September 14
        $res1 = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Vodka [Wild Top Gear]',
            'rarity' => 'SR',
            'pulled_at' => '2026-09-14 10:00:00',
        ]);
        $res1->assertStatus(201);
        $pullLaterId = $res1->json('data.id');

        // Later in time, user inputs an earlier historical pull on August 28
        $res2 = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Haru Urara [Bestest Prize ♪]',
            'rarity' => 'R',
            'pulled_at' => '2026-08-28 10:00:00',
        ]);
        $res2->assertStatus(201);
        $pullEarlierId = $res2->json('data.id');

        // Query database pulls directly
        $earlierPull = GachaPull::find($pullEarlierId);
        $laterPull = GachaPull::find($pullLaterId);

        // Even though earlierPull was inserted later, its earlier date must give it pity #1
        $this->assertEquals(1, $earlierPull->pity_count_at_pull);
        // And the pull from September 14 must be sequenced as pity #2
        $this->assertEquals(2, $laterPull->pity_count_at_pull);

        // Check active pity for banner
        $pity = GachaPity::forBanner('character', $banner->id);
        $this->assertEquals(2, $pity->current_pity);
    }

    public function test_scenario_order_matches_release_timeline(): void
    {
        $res = $this->getJson('/api/career/metadata');
        $res->assertStatus(200);
        $scenarios = $res->json('scenarios');

        $idxTracen = array_search('Tracen-ken', $scenarios, true);
        $idxDreams = array_search('Beyond Dreams', $scenarios, true);
        $idxOnsen = array_search('Yukoma Onsen', $scenarios, true);
        $idxIsland = array_search('Design Your Island', $scenarios, true);
        $idxTwinkle = array_search('The Twinkle Legends', $scenarios, true);
        $idxMecha = array_search('Mecha Uma Musume', $scenarios, true);
        $idxFood = array_search('Great Food Festival', $scenarios, true);

        $this->assertNotFalse($idxTracen);
        $this->assertNotFalse($idxDreams);
        $this->assertNotFalse($idxOnsen);
        $this->assertNotFalse($idxIsland);
        $this->assertNotFalse($idxTwinkle);
        $this->assertNotFalse($idxMecha);
        $this->assertNotFalse($idxFood);

        // In dropdown order (top to bottom): Tracen-ken < Beyond Dreams < Yukoma Onsen < Design Your Island < The Twinkle Legends < Mecha < Great Food Festival
        $this->assertTrue($idxTracen < $idxDreams);
        $this->assertTrue($idxDreams < $idxOnsen);
        $this->assertTrue($idxOnsen < $idxIsland);
        $this->assertTrue($idxIsland < $idxTwinkle);
        $this->assertTrue($idxTwinkle < $idxMecha);
        $this->assertTrue($idxMecha < $idxFood);
    }

    public function test_career_stats_includes_character_performance_breakdown_separating_variants(): void
    {
        CareerRun::create([
            'uma_name' => 'Shinko Windy',
            'fans_gained' => 400000,
            'final_rank' => 'SS',
            'evaluation_score' => 20000,
            'scenario' => 'Tracen-ken',
            'run_date' => now()->format('Y-m-d'),
            'training_type' => 'manual',
        ]);

        CareerRun::create([
            'uma_name' => 'Shinko Windy (5.5th Anni)',
            'fans_gained' => 600000,
            'final_rank' => 'UG',
            'evaluation_score' => 22000,
            'scenario' => 'Tracen-ken',
            'run_date' => now()->format('Y-m-d'),
            'training_type' => 'manual',
        ]);

        $res = $this->getJson('/api/career/stats');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'scenario_stats',
                'character_stats',
            ]);

        $charStats = collect($res->json('character_stats'));

        $windyOriginal = $charStats->firstWhere('uma_name', 'Shinko Windy');
        $windyVariant = $charStats->firstWhere('uma_name', 'Shinko Windy (5.5th Anni)');

        $this->assertNotNull($windyOriginal);
        $this->assertNotNull($windyVariant);
        $this->assertEquals(400000, (int) $windyOriginal['avg_fans']);
        $this->assertEquals(400000, (int) $windyOriginal['min_fans']);
        $this->assertEquals(400000, (int) $windyOriginal['max_fans']);
        $this->assertEquals(600000, (int) $windyVariant['avg_fans']);
        $this->assertEquals(600000, (int) $windyVariant['min_fans']);
        $this->assertEquals(600000, (int) $windyVariant['max_fans']);
        $this->assertEquals(1, $windyOriginal['runs_count']);
        $this->assertEquals(1, $windyVariant['runs_count']);

        $scenarioStats = collect($res->json('scenario_stats'));
        $tracenStats = $scenarioStats->firstWhere('scenario', 'Tracen-ken');
        $this->assertNotNull($tracenStats);
        $this->assertEquals(400000, (int) $tracenStats['min_fans']);
        $this->assertEquals(600000, (int) $tracenStats['max_fans']);
    }

    public function test_career_metadata_includes_dynamic_base_uma_stars(): void
    {
        $res = $this->getJson('/api/career/metadata');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'scenarios',
                'ranks',
                'rank_thresholds',
                'uma_presets',
                'uma_stars',
            ]);

        $stars = $res->json('uma_stars');
        $this->assertIsArray($stars);

        // Verify specific star ratings
        $this->assertEquals(1, $stars['Agnes Tachyon'] ?? null);
        $this->assertEquals(1, $stars['Haru Urara'] ?? null);
        $this->assertEquals(1, $stars['Sakura Bakushin O'] ?? null);
        $this->assertEquals(2, $stars['Air Groove'] ?? null);
        $this->assertEquals(2, $stars['Gold Ship'] ?? null);
        $this->assertEquals(2, $stars['Vodka'] ?? null);
        $this->assertEquals(3, $stars['Admire Vega'] ?? 3);
        $this->assertEquals(3, $stars['Oguri Cap'] ?? 3);
    }

    public function test_career_metadata_excludes_unplayable_characters(): void
    {
        $res = $this->getJson('/api/career/metadata');
        $res->assertStatus(200);

        $presets = $res->json('uma_presets');
        $this->assertIsArray($presets);

        // Playable characters must be present
        $this->assertContains('Daring Heart', $presets);
        $this->assertContains('Special Week', $presets);
        $this->assertContains('Almond Eye', $presets);
        $this->assertContains('Rose Kingdom', $presets);

        // Unreleased/unplayable lore, support-only, & NPC characters must NEVER be present
        $unplayables = [
            'Blast Onepiece',
            'Daring Tact',
            'Contrail',
            'Equinox',
            'Efforia',
            'Casino Drive',
            'Forever Young',
            'Marche Lorraine',
            'Sakura Chitose O',
            'Samson Big',
            'Aoi Kiryuin',
            'Tazuna Hayakawa',
            'Yayoi Akikawa',
        ];

        foreach ($unplayables as $unplayable) {
            $this->assertNotContains($unplayable, $presets, "Unplayable character '{$unplayable}' should not be in Career uma_presets.");
        }
    }

    public function test_circle_tracker_status_reports_has_circle_false_when_unset(): void
    {
        AppSetting::setValue('circle_id', '');

        $res = $this->getJson('/api/circle-tracker/status');
        $res->assertStatus(200)
            ->assertJsonPath('has_circle', false)
            ->assertJsonPath('has_data', false);
    }

    public function test_circle_tracker_set_and_clear_circle_endpoints(): void
    {
        Http::fake([
            'https://muxueuma.com/api/circles/441730573/contributions' => Http::response([
                'circle' => ['name' => 'なんか適当', 'memberCount' => 30],
                'rows' => [
                    ['viewerId' => '886175385', 'playerName' => 'TestPlayer', 'contribution' => 15000000],
                ],
                'activeTotal' => 50000000,
                'period' => '2026-09-01',
            ], 200),
            'https://muxueuma.com/api/circles/441730573/ranking-trend*' => Http::response([
                'current' => ['rank' => 986, 'point' => 50000000, 'period' => '2026-09-01'],
                'points' => [],
            ], 200),
        ]);

        // 1. Set Circle
        $setRes = $this->postJson('/api/circle-tracker/set-circle', [
            'circle_id' => '441730573',
        ]);
        $setRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_circle', true)
            ->assertJsonPath('data.circle_id', '441730573')
            ->assertJsonPath('data.circle_name', 'なんか適当');

        $this->assertEquals('441730573', AppSetting::getValue('circle_id'));

        // 2. Clear Circle
        $clearRes = $this->postJson('/api/circle-tracker/clear-circle');
        $clearRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_circle', false);

        $this->assertEquals('', AppSetting::getValue('circle_id'));
    }

    public function test_dashboard_summary_includes_active_banners_with_days_remaining_and_accurate_star_ratings(): void
    {
        GachaBanner::create([
            'name' => 'Active Today Banner',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.5,
            'start_date' => now()->subDays(2)->format('Y-m-d'),
            'end_date' => now()->addDays(5)->format('Y-m-d'),
            'featured_items' => [
                'Epiphaneia [Fate\'s Chosen Star]',
                'Vodka [Wild Top Gear]',
                'Agnes Tachyon [tach-nology]',
            ],
        ]);

        GachaBanner::create([
            'name' => 'Empty Dummy Banner',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.0,
            'start_date' => now()->subDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(2)->format('Y-m-d'),
            'featured_items' => [],
        ]);

        $res = $this->getJson('/api/dashboard/summary');
        $res->assertStatus(200);
        $activeBanners = collect($res->json('active_banners'));

        $banner = $activeBanners->firstWhere('name', 'Active Today Banner');
        $this->assertNotNull($banner);
        $this->assertEquals('character', $banner['banner_type']);
        $this->assertEquals(4.5, (float) $banner['base_rate']);
        $this->assertEquals(5, (int) $banner['days_remaining']);

        // Check structured items and star tiers
        $items = $banner['featured_items'];
        $this->assertCount(3, $items);

        // B3 Epiphaneia
        $this->assertEquals('Epiphaneia [Fate\'s Chosen Star]', $items[0]['name']);
        $this->assertEquals(3, $items[0]['stars']);
        $this->assertEquals('B3', $items[0]['tier_label']);
        $this->assertEquals('★★★ (B3)', $items[0]['badge_text']);

        // B2 Vodka
        $this->assertEquals('Vodka [Wild Top Gear]', $items[1]['name']);
        $this->assertEquals(2, $items[1]['stars']);
        $this->assertEquals('B2', $items[1]['tier_label']);
        $this->assertEquals('★★ (B2)', $items[1]['badge_text']);

        // B1 Agnes Tachyon
        $this->assertEquals('Agnes Tachyon [tach-nology]', $items[2]['name']);
        $this->assertEquals(1, $items[2]['stars']);
        $this->assertEquals('B1', $items[2]['tier_label']);
        $this->assertEquals('★ (B1)', $items[2]['badge_text']);

        // Empty dummy banner should NOT be included
        $this->assertNull($activeBanners->firstWhere('name', 'Empty Dummy Banner'));
    }

    public function test_career_runs_can_be_filtered_and_paginated(): void
    {
        CareerRun::create([
            'uma_name' => 'Tokai Teio',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'manual',
            'fans_gained' => 450000,
            'evaluation_score' => 24000,
            'final_rank' => 'UF',
            'run_date' => '2026-03-01',
            'notes' => 'Sprint Ace Run',
        ]);

        CareerRun::create([
            'uma_name' => 'Mejiro McQueen',
            'scenario' => 'Great Food Festival',
            'training_type' => 'independent',
            'fans_gained' => 300000,
            'evaluation_score' => 19500,
            'final_rank' => 'SS+',
            'run_date' => '2026-03-05',
            'notes' => 'Fans Gain Run',
        ]);

        CareerRun::create([
            'uma_name' => 'Silence Suzuka',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'manual',
            'fans_gained' => 600000,
            'evaluation_score' => 35000,
            'final_rank' => 'UD',
            'run_date' => '2026-03-10',
            'notes' => 'Mile Ace Run',
        ]);

        // Filter by scenario
        $res = $this->getJson('/api/career/runs?scenario=Great Food Festival');
        $res->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.uma_name', 'Mejiro McQueen');

        // Filter by date range
        $res = $this->getJson('/api/career/runs?date_from=2026-03-02&date_to=2026-03-06');
        $res->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.uma_name', 'Mejiro McQueen');

        // Filter by uma_name
        $res = $this->getJson('/api/career/runs?uma_name=Suzuka');
        $res->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.uma_name', 'Silence Suzuka');

        // Filter by rank_min (UD requires 34000 points)
        $res = $this->getJson('/api/career/runs?rank_min=UD');
        $res->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.uma_name', 'Silence Suzuka');

        // Filter by rank_max (SS+ max score is around 19200-19599)
        $res = $this->getJson('/api/career/runs?rank_max='.urlencode('SS+'));
        $res->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.uma_name', 'Mejiro McQueen');

        // Dynamic per_page
        $res = $this->getJson('/api/career/runs?per_page=25');
        $res->assertStatus(200)->assertJsonPath('per_page', 25)->assertJsonPath('total', 3);
    }

    public function test_career_runs_bulk_delete(): void
    {
        $run1 = CareerRun::create([
            'uma_name' => 'Run 1',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 100000,
            'evaluation_score' => 15000,
            'final_rank' => 'S',
            'run_date' => '2026-03-01',
        ]);

        $run2 = CareerRun::create([
            'uma_name' => 'Run 2',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 200000,
            'evaluation_score' => 18000,
            'final_rank' => 'SS',
            'run_date' => '2026-03-02',
        ]);

        $run3 = CareerRun::create([
            'uma_name' => 'Run 3',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 300000,
            'evaluation_score' => 22000,
            'final_rank' => 'UG',
            'run_date' => '2026-03-03',
        ]);

        $res = $this->postJson('/api/career/bulk-delete', [
            'ids' => [$run1->id, $run2->id],
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('deleted_count', 2);

        $this->assertDatabaseMissing('career_runs', ['id' => $run1->id]);
        $this->assertDatabaseMissing('career_runs', ['id' => $run2->id]);
        $this->assertDatabaseHas('career_runs', ['id' => $run3->id]);

        // Validation failure on empty ids
        $errRes = $this->postJson('/api/career/bulk-delete', ['ids' => []]);
        $errRes->assertStatus(422)->assertJsonValidationErrors(['ids']);
    }

    public function test_gacha_pulls_can_be_filtered_and_paginated(): void
    {
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Special Week',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-03-01 10:00:00',
            'pity_count_at_pull' => 0,
        ]);

        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Vodka',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pulled_at' => '2026-03-05 10:00:00',
            'pity_count_at_pull' => 1,
        ]);

        GachaPull::create([
            'banner_type' => 'support_card',
            'gacha_banner_id' => $this->supportCardBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Kitasan Black',
            'rarity' => 'SSR',
            'is_rate_up' => false,
            'pulled_at' => '2026-03-10 10:00:00',
            'pity_count_at_pull' => 0,
        ]);

        // Filter by rarity SSR
        $res = $this->getJson('/api/gacha/pulls?rarity=SSR');
        $res->assertStatus(200)->assertJsonPath('total', 2);

        // Filter by is_rate_up
        $res = $this->getJson('/api/gacha/pulls?is_rate_up=true');
        $res->assertStatus(200)->assertJsonPath('total', 1)->assertJsonPath('data.0.item_name', 'Special Week');

        // Filter by banner_id
        $res = $this->getJson('/api/gacha/pulls?banner_id='.$this->supportCardBanner->id);
        $res->assertStatus(200)->assertJsonPath('total', 1)->assertJsonPath('data.0.item_name', 'Kitasan Black');

        // Filter by date range
        $res = $this->getJson('/api/gacha/pulls?date_from=2026-03-02&date_to=2026-03-06');
        $res->assertStatus(200)->assertJsonPath('total', 1)->assertJsonPath('data.0.item_name', 'Vodka');

        // Dynamic per_page
        $res = $this->getJson('/api/gacha/pulls?per_page=50');
        $res->assertStatus(200)->assertJsonPath('per_page', 50)->assertJsonPath('total', 3);
    }

    public function test_gacha_pulls_bulk_delete_and_pity_recalculation(): void
    {
        $pull1 = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Nice Nature',
            'rarity' => 'R',
            'is_rate_up' => false,
            'pulled_at' => '2026-03-01 10:00:00',
            'pity_count_at_pull' => 1,
        ]);

        $pull2 = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Matikanetannhauser',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pulled_at' => '2026-03-01 10:01:00',
            'pity_count_at_pull' => 2,
        ]);

        $pull3 = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Silence Suzuka',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-03-01 10:02:00',
            'pity_count_at_pull' => 0,
        ]);

        // Current pity should be 3 before deletion
        GachaPity::recalculate('character', $this->characterBanner->id);
        $this->assertEquals(3, GachaPity::forBanner('character', $this->characterBanner->id)->current_pity);

        // Now bulk delete pull3
        $res = $this->postJson('/api/gacha/bulk-delete', [
            'ids' => [$pull3->id],
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('deleted_count', 1);

        $this->assertDatabaseMissing('gacha_pulls', ['id' => $pull3->id]);

        // Pity must be automatically recalculated to 2!
        $this->assertEquals(2, GachaPity::forBanner('character', $this->characterBanner->id)->current_pity);
    }

    public function test_career_stats_supports_daily_accumulation_and_custom_ranges(): void
    {
        CareerRun::create([
            'uma_name' => 'Tokai Teio',
            'scenario' => 'The Twinkle Legends',
            'fans_gained' => 500000,
            'evaluation_score' => 25000,
            'final_rank' => 'UF',
            'run_date' => now()->format('Y-m-d'),
        ]);

        $res7 = $this->getJson('/api/career/stats?range=7_days');
        $res7->assertStatus(200)
            ->assertJsonStructure([
                'total_runs',
                'total_fans',
                'daily_trends',
                'monthly_circle_target',
                'scenario_stats',
                'character_stats',
            ]);

        $this->assertNotEmpty($res7->json('daily_trends'));
        $this->assertArrayHasKey('cumulative_fans', $res7->json('daily_trends.0'));

        $res30 = $this->getJson('/api/career/stats?range=30_days');
        $res30->assertStatus(200);
        $this->assertNotEmpty($res30->json('daily_trends'));
    }

    public function test_gacha_stats_includes_ssr_intervals_and_rarity_percentages(): void
    {
        // Pull 1-4: R
        for ($i = 1; $i <= 4; $i++) {
            GachaPull::create([
                'banner_type' => 'character',
                'gacha_banner_id' => $this->characterBanner->id,
                'pull_type' => 'single',
                'item_name' => "R Card {$i}",
                'rarity' => 'R',
                'pulled_at' => "2026-03-01 10:0{$i}:00",
            ]);
        }

        // Pull 5: SSR
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->characterBanner->id,
            'pull_type' => 'single',
            'item_name' => 'SSR Uma 1',
            'rarity' => 'SSR',
            'pulled_at' => '2026-03-01 10:05:00',
        ]);

        $res = $this->getJson('/api/gacha/stats');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'total_pulls',
                'ssr_count',
                'ssr_intervals',
                'rarity_distribution',
            ]);

        $intervals = $res->json('ssr_intervals');
        $this->assertCount(1, $intervals);
        $this->assertEquals(5, $intervals[0]['pulls_needed']);
        $this->assertEquals('SSR Uma 1', $intervals[0]['item_name']);
    }

    public function test_circle_tracker_pace_estimator_calculations(): void
    {
        // 1. Initial pace endpoint check
        $res = $this->getJson('/api/circle-tracker/pace');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'monthly_circle_target',
                'current_fans',
                'remaining_fans',
                'days_in_month',
                'current_day',
                'days_remaining',
                'required_daily_pace',
                'current_daily_pace',
                'avg_fans_per_run',
                'estimated_runs_per_day',
                'status',
                'progress_percentage',
                'is_target_reached',
            ]);

        // 2. Add CareerRun for current month and verify pace changes
        CareerRun::create([
            'uma_name' => 'Special Week',
            'fans_gained' => 600000,
            'final_rank' => 'UG',
            'run_date' => now()->format('Y-m-d'),
            'scenario' => 'U.A.F. Ready GO!',
            'training_type' => 'manual',
        ]);

        $res2 = $this->getJson('/api/circle-tracker/pace');
        $res2->assertStatus(200);
        $this->assertGreaterThanOrEqual(600000, $res2->json('current_fans'));
        $this->assertEquals(600000, $res2->json('avg_fans_per_run'));

        // 3. Test custom target parameter
        $resCustom = $this->getJson('/api/circle-tracker/pace?target=40000000');
        $resCustom->assertStatus(200)
            ->assertJsonPath('monthly_circle_target', 40000000);

        // 4. Status endpoint also includes pace_estimator
        $resStatus = $this->getJson('/api/circle-tracker/status');
        $resStatus->assertStatus(200);
        $this->assertArrayHasKey('pace_estimator', $resStatus->json());
    }

    public function test_planner_get_and_save_config(): void
    {
        // 1. GET default config
        $res = $this->getJson('/api/planner/config');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('config.free_carats', 15000)
            ->assertJsonPath('config.include_predictions', true);
        $this->assertEquals(1.0, $res->json('config.spark_goal_multiplier'));

        // 2. POST custom config
        $payload = [
            'free_carats' => 45000,
            'paid_carats' => 1500,
            'single_tickets' => 10,
            'ten_tickets' => 3,
            'target_date' => now()->addDays(45)->format('Y-m-d'),
            'spark_goal_multiplier' => 2.0,
            'include_predictions' => false,
            'f2p_daily_missions' => true,
            'f2p_login_bonus' => true,
            'stadium_class' => 6,
            'circle_rank' => 'SS',
            'champions_meeting_target' => 'final_a_1',
            'f2p_training_pass' => true,
            'story_events_count' => 2,
            'legend_races_count' => 2,
            'g1_bonus_enabled' => true,
            'pakalive_streams_count' => 2,
            'daily_jewel_pack' => true,
            'trainer_pass' => true,
        ];

        $postRes = $this->postJson('/api/planner/config', $payload);
        $postRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('config.free_carats', 45000)
            ->assertJsonPath('config.circle_rank', 'SS')
            ->assertJsonPath('config.include_predictions', false);
        $this->assertEquals(2.0, $postRes->json('config.spark_goal_multiplier'));

        // 3. GET config should now return persisted values
        $getRes = $this->getJson('/api/planner/config');
        $getRes->assertStatus(200)
            ->assertJsonPath('config.free_carats', 45000)
            ->assertJsonPath('config.paid_carats', 1500)
            ->assertJsonPath('config.circle_rank', 'SS')
            ->assertJsonPath('config.include_predictions', false);
        $this->assertEquals(2.0, $getRes->json('config.spark_goal_multiplier'));
    }

    public function test_can_update_gacha_pull_and_recalculate_pity(): void
    {
        $banner = GachaBanner::create([
            'name' => '5th Anniversary Premium Pretty Derby Gacha',
            'category' => 'character',
            'base_rate' => 4.5,
            'start_date' => '2026-02-24',
            'end_date' => '2026-03-30',
            'featured_items' => ['Almond Eye [The Changer]'],
            'is_active' => true,
        ]);

        $pull1 = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Haru Urara',
            'rarity' => 'R',
            'is_rate_up' => false,
            'pity_count_at_pull' => 1,
            'pulled_at' => '2026-03-01 10:00:00',
        ]);

        $pull2 = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Vodka',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pity_count_at_pull' => 2,
            'pulled_at' => '2026-03-01 10:05:00',
        ]);

        // Update pull1 to an SSR Almond Eye with rate up
        $res = $this->putJson("/api/gacha/pulls/{$pull1->id}", [
            'banner_type' => 'character',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => 'Almond Eye [The Changer]',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-03-01',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.item_name', 'Almond Eye [The Changer]')
            ->assertJsonPath('data.rarity', 'SSR')
            ->assertJsonPath('data.is_rate_up', true);

        $this->assertDatabaseHas('gacha_pulls', [
            'id' => $pull1->id,
            'item_name' => 'Almond Eye [The Changer]',
            'rarity' => 'SSR',
            'is_rate_up' => true,
        ]);
    }

    public function test_can_update_career_run_with_auto_rank(): void
    {
        $run = CareerRun::create([
            'uma_name' => 'Oguri Cap',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'manual',
            'fans_gained' => 450000,
            'evaluation_score' => 23400,
            'final_rank' => 'UF',
            'notes' => 'Original test run',
            'run_date' => '2026-03-01',
        ]);

        $res = $this->putJson("/api/career/runs/{$run->id}", [
            'uma_name' => 'Oguri Cap [Cinderella Gray]',
            'scenario' => 'Beyond Dreams',
            'training_type' => 'independent',
            'fans_gained' => 650000,
            'evaluation_score' => 28500,
            'final_rank' => 'UC',
            'notes' => 'Updated test run',
            'run_date' => '2026-03-02',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.uma_name', 'Oguri Cap [Cinderella Gray]')
            ->assertJsonPath('data.scenario', 'Beyond Dreams')
            ->assertJsonPath('data.training_type', 'independent')
            ->assertJsonPath('data.fans_gained', 650000);

        $this->assertDatabaseHas('career_runs', [
            'id' => $run->id,
            'uma_name' => 'Oguri Cap [Cinderella Gray]',
            'scenario' => 'Beyond Dreams',
            'training_type' => 'independent',
            'fans_gained' => 650000,
        ]);
    }

    public function test_career_scenario_detail_returns_characters_and_total_fans(): void
    {
        CareerRun::create([
            'uma_name' => 'Mejiro Ramonu [Epithet 1]',
            'scenario' => 'Tracen-ken',
            'training_type' => 'manual',
            'fans_gained' => 400000,
            'evaluation_score' => 62000,
            'final_rank' => 'UA9',
            'run_date' => '2026-03-01',
        ]);

        CareerRun::create([
            'uma_name' => 'Mejiro Ramonu [Epithet 1]',
            'scenario' => 'Tracen-ken',
            'training_type' => 'manual',
            'fans_gained' => 350000,
            'evaluation_score' => 60000,
            'final_rank' => 'UA7',
            'run_date' => '2026-03-02',
        ]);

        CareerRun::create([
            'uma_name' => 'Oguri Cap',
            'scenario' => 'Tracen-ken',
            'training_type' => 'independent',
            'fans_gained' => 500000,
            'evaluation_score' => 65000,
            'final_rank' => 'US1',
            'run_date' => '2026-03-03',
        ]);

        // Validation error if scenario is missing
        $resError = $this->getJson('/api/career/scenario-detail');
        $resError->assertStatus(422);

        // Success response
        $response = $this->getJson('/api/career/scenario-detail?scenario=Tracen-ken');
        $response->assertStatus(200)
            ->assertJsonPath('scenario', 'Tracen-ken')
            ->assertJsonPath('total_runs', 3)
            ->assertJsonPath('total_fans', 1250000)
            ->assertJsonPath('avg_fans', 416667)
            ->assertJsonPath('min_fans', 350000)
            ->assertJsonPath('max_fans', 500000);

        $characters = $response->json('characters');
        $this->assertCount(2, $characters);

        // Sorted by total_fans desc: Mejiro Ramonu (750k) > Oguri Cap (500k)
        $this->assertSame('Mejiro Ramonu [Epithet 1]', $characters[0]['uma_name']);
        $this->assertSame(2, $characters[0]['runs_count']);
        $this->assertSame(750000, $characters[0]['total_fans']);
        $this->assertSame('UA9', $characters[0]['best_rank']);

        $this->assertSame('Oguri Cap', $characters[1]['uma_name']);
        $this->assertSame(1, $characters[1]['runs_count']);
        $this->assertSame(500000, $characters[1]['total_fans']);
        $this->assertSame('US1', $characters[1]['best_rank']);

        // Check recent runs count
        $recentRuns = $response->json('recent_runs');
        $this->assertCount(3, $recentRuns);
    }

    public function test_character_detail_endpoint_returns_scenario_breakdown_and_recent_runs(): void
    {
        CareerRun::query()->delete();

        // Create runs for Oguri Cap across two scenarios
        CareerRun::create([
            'uma_name' => 'Oguri Cap',
            'scenario' => 'URA Finals',
            'starting_fans' => 0,
            'ending_fans' => 400000,
            'fans_gained' => 400000,
            'evaluation_score' => 19500,
            'final_rank' => 'UA6',
            'run_date' => '2026-10-01',
        ]);
        CareerRun::create([
            'uma_name' => 'Oguri Cap',
            'scenario' => 'URA Finals',
            'starting_fans' => 0,
            'ending_fans' => 500000,
            'fans_gained' => 500000,
            'evaluation_score' => 21000,
            'final_rank' => 'UA8',
            'run_date' => '2026-10-02',
        ]);
        CareerRun::create([
            'uma_name' => 'Oguri Cap',
            'scenario' => 'Aoharu Hai',
            'starting_fans' => 0,
            'ending_fans' => 300000,
            'fans_gained' => 300000,
            'evaluation_score' => 18000,
            'final_rank' => 'UA4',
            'run_date' => '2026-10-03',
        ]);

        // Validation error if uma_name is missing
        $resError = $this->getJson('/api/career/character-detail');
        $resError->assertStatus(422);

        // Success response
        $response = $this->getJson('/api/career/character-detail?uma_name=Oguri+Cap');
        $response->assertStatus(200)
            ->assertJsonPath('uma_name', 'Oguri Cap')
            ->assertJsonPath('total_runs', 3)
            ->assertJsonPath('total_fans', 1200000)
            ->assertJsonPath('avg_fans', 400000)
            ->assertJsonPath('min_fans', 300000)
            ->assertJsonPath('max_fans', 500000)
            ->assertJsonPath('best_rank', 'UA8');

        $scenarios = $response->json('scenarios');
        $this->assertCount(2, $scenarios);

        // Sorted by total_fans desc: URA Finals (900k) > Aoharu Hai (300k)
        $this->assertSame('URA Finals', $scenarios[0]['scenario']);
        $this->assertSame(2, $scenarios[0]['runs_count']);
        $this->assertSame(900000, $scenarios[0]['total_fans']);
        $this->assertSame(450000, $scenarios[0]['avg_fans']);
        $this->assertSame('UA8', $scenarios[0]['best_rank']);
        $this->assertEquals(66.7, $scenarios[0]['percentage']);

        $this->assertSame('Aoharu Hai', $scenarios[1]['scenario']);
        $this->assertSame(1, $scenarios[1]['runs_count']);
        $this->assertSame(300000, $scenarios[1]['total_fans']);
        $this->assertSame('UA4', $scenarios[1]['best_rank']);
        $this->assertEquals(33.3, $scenarios[1]['percentage']);

        // Check recent runs count
        $recentRuns = $response->json('recent_runs');
        $this->assertCount(3, $recentRuns);
    }

    public function test_character_avatar_resolution_with_parentheses_aliases(): void
    {
        // Seed catalog item for Oguri Cap and Inari One
        UmaCatalogItem::updateOrCreate(
            ['type' => 'character', 'name' => 'Oguri Cap [Ashen Miracle]'],
            [
                'rarity' => 'SSR',
                'raw_data' => [
                    'image_url' => 'https://gametora.com/images/umamusume/characters/thumb/chara_stand_1006_100601.png',
                ],
            ]
        );
        UmaCatalogItem::updateOrCreate(
            ['type' => 'character', 'name' => 'Inari One [Edomurasaki]'],
            [
                'rarity' => 'SSR',
                'raw_data' => [
                    'image_url' => 'https://gametora.com/images/umamusume/characters/thumb/chara_stand_1034_103401.png',
                ],
            ]
        );

        CareerRun::query()->delete();
        CareerRun::create([
            'uma_name' => 'Oguri Cap (Anime Collab)',
            'scenario' => 'URA Finals',
            'fans_gained' => 450000,
            'evaluation_score' => 20000,
            'final_rank' => 'UA6',
            'run_date' => '2026-10-01',
        ]);
        CareerRun::create([
            'uma_name' => 'Inari One (Fall Festival)',
            'scenario' => 'URA Finals',
            'fans_gained' => 420000,
            'evaluation_score' => 19000,
            'final_rank' => 'UA5',
            'run_date' => '2026-10-01',
        ]);

        // Scenario detail endpoint should resolve avatar URLs for both aliases
        $scRes = $this->getJson('/api/career/scenario-detail?scenario=URA+Finals');
        $scRes->assertStatus(200);
        $chars = collect($scRes->json('characters'));

        $oguri = $chars->firstWhere('uma_name', 'Oguri Cap (Anime Collab)');
        $this->assertNotNull($oguri);
        $this->assertSame('https://gametora.com/images/umamusume/characters/thumb/chara_stand_1006_100601.png', $oguri['image_url']);

        $inari = $chars->firstWhere('uma_name', 'Inari One (Fall Festival)');
        $this->assertNotNull($inari);
        $this->assertSame('https://gametora.com/images/umamusume/characters/thumb/chara_stand_1034_103401.png', $inari['image_url']);

        // Character detail endpoint should also resolve avatar URL
        $charRes = $this->getJson('/api/career/character-detail?uma_name='.urlencode('Oguri Cap (Anime Collab)'));
        $charRes->assertStatus(200)
            ->assertJsonPath('image_url', 'https://gametora.com/images/umamusume/characters/thumb/chara_stand_1006_100601.png');
    }
}
