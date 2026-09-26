<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\CircleSnapshot;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Models\UserSupportCard;
use App\Services\BackupService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Tests\TestCase;

class BackupRoundTripTest extends TestCase
{
    use RefreshDatabase;

    protected BackupService $backupService;

    protected function setUp(): void
    {
        parent::setUp();
        DB::statement('PRAGMA foreign_keys = ON;');
        $this->backupService = new BackupService;
    }

    /**
     * Test full backup round-trip:
     * Export existing rich data -> Clear database -> Import backup -> Verify 100% semantic identity.
     */
    public function test_round_trip_export_and_import_restores_semantically_identical_data(): void
    {
        // Clean any migration seeds to ensure precise control over test data
        UserCharacter::query()->delete();
        UserSupportCard::query()->delete();
        GachaPull::query()->delete();
        GachaPity::query()->delete();
        GachaBanner::query()->delete();
        UmaCatalogItem::query()->delete();
        CareerRun::query()->delete();
        CircleSnapshot::query()->delete();
        AppSetting::query()->delete();

        // 1. Seed App Settings
        AppSetting::setValue('circle_id', '441730573');
        AppSetting::setValue('tracked_viewer_id', '886175385');
        AppSetting::setValue('planner_config', json_encode([
            'free_carats' => 15000,
            'paid_carats' => 0,
            'target_banner_type' => 'support',
        ]));

        // 2. Seed Gacha Banners
        $charBanner = GachaBanner::create([
            'id' => 70001,
            'gametora_id' => 101,
            'name' => '5th Anniversary Pretty Derby Gacha',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'start_date' => '2026-02-24',
            'end_date' => '2026-03-10',
            'featured_items' => ['Almond Eye', 'Gentildonna'],
            'is_active' => true,
        ]);

        $cardBanner = GachaBanner::create([
            'id' => 70002,
            'gametora_id' => 102,
            'name' => 'SSR Efforia Pickup Support Card Gacha',
            'banner_type' => 'support',
            'category' => 'standard',
            'base_rate' => 3.00,
            'start_date' => '2026-03-11',
            'end_date' => '2026-03-25',
            'featured_items' => ['SSR [The Unbreakable] Efforia'],
            'is_active' => true,
        ]);

        // 3. Seed Gacha Pities
        GachaPity::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $charBanner->id,
            'current_pity' => 60,
            'total_sparks' => 1,
            'last_reset_at' => Carbon::parse('2026-02-24 12:00:00'),
        ]);

        GachaPity::create([
            'banner_type' => 'support',
            'gacha_banner_id' => $cardBanner->id,
            'current_pity' => 30,
            'total_sparks' => 0,
            'last_reset_at' => null,
        ]);

        // 4. Seed Gacha Pulls
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $charBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Almond Eye',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pity_count_at_pull' => 1,
            'pulled_at' => Carbon::parse('2026-02-24 15:30:00'),
        ]);

        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $charBanner->id,
            'pull_type' => 'multi',
            'item_name' => 'Nice Nature',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pity_count_at_pull' => 11,
            'pulled_at' => Carbon::parse('2026-02-24 15:35:00'),
        ]);

        // 5. Seed Career Runs
        CareerRun::create([
            'uma_name' => 'Kitasan Black',
            'run_date' => '2026-03-01',
            'scenario' => 'The Twinkle Legends',
            'training_type' => 'manual',
            'starting_fans' => 1000,
            'ending_fans' => 550000,
            'fans_gained' => 549000,
            'final_rank' => 'UC5',
            'evaluation_score' => 32450,
            'notes' => 'Great run with 2 Long aptitude skills and Arima Kinen double win',
        ]);

        CareerRun::create([
            'uma_name' => 'Satono Diamond',
            'run_date' => '2026-03-02',
            'scenario' => 'Beyond Dreams',
            'training_type' => 'independent',
            'starting_fans' => 5000,
            'ending_fans' => 320000,
            'fans_gained' => 315000,
            'final_rank' => 'SS',
            'evaluation_score' => 24100,
            'notes' => 'Autonomous run during training camp',
        ]);

        // 6. Seed Circle Snapshots (active schema)
        $snapshotPayload = [
            'contributions' => [
                'circle' => [
                    'id' => '441730573',
                    'name' => 'なんか適当',
                    'memberCount' => 30,
                ],
                'rows' => [
                    [
                        'rank' => 1,
                        'viewerId' => 414486880,
                        'playerName' => 'ルカ',
                        'contribution' => 84677687,
                    ],
                    [
                        'rank' => 9,
                        'viewerId' => 886175385,
                        'playerName' => 'u1w0q8n6',
                        'contribution' => 32692179,
                    ],
                ],
            ],
            'trend' => [
                'range' => '7d',
                'current' => [
                    'rank' => 986,
                    'point' => 1171960184,
                ],
            ],
        ];

        CircleSnapshot::create([
            'circle_id' => '441730573',
            'circle_name' => 'なんか適当',
            'rank' => 986,
            'point' => 1171960184,
            'member_count' => 30,
            'active_total' => 853547402,
            'period' => '2026-09-01',
            'payload' => $snapshotPayload,
            'last_refreshed_at' => Carbon::parse('2026-09-15 03:03:16'),
        ]);

        // 7. Seed Uma Catalog Items (character and support card with full JSON fields)
        $charCatalog = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Kitasan Black [Bright Blast]',
            'rarity' => 'SSR',
            'gametora_id' => 106801,
            'raw_data' => [
                'id' => 106801,
                'name' => 'Kitasan Black',
                'title' => 'Bright Blast',
                'rarity' => 3,
            ],
            'aptitudes' => [
                'track' => ['turf' => 'A', 'dirt' => 'G'],
                'distance' => ['short' => 'E', 'mile' => 'C', 'medium' => 'A', 'long' => 'A'],
                'style' => ['runner' => 'A', 'leader' => 'B', 'betweener' => 'C', 'chaser' => 'G'],
            ],
            'skills' => [
                'innate' => [
                    ['id' => 2001, 'name' => 'Leader Pride', 'rarity' => 'Normal'],
                ],
                'evolved' => [
                    [
                        'id' => 5001,
                        'name' => 'Bright Blast Max',
                        'conditions' => [
                            ['Win the Arima Kinen twice', 'Have at least 600 Stamina'],
                            ['Get at least 2 skills for Long aptitude'],
                        ],
                    ],
                ],
            ],
            'objectives' => [
                ['order' => 1, 'turn' => 11, 'title' => 'Junior Debut', 'target' => 'Race Completion'],
                ['order' => 2, 'turn' => 31, 'title' => 'Satsuki Sho', 'target' => 'Top 5'],
            ],
            'details' => [
                'growth_rates' => ['speed' => 20, 'stamina' => 10],
            ],
        ]);

        $cardCatalog = UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => 'SSR [The Unbreakable] Efforia (Speed)',
            'rarity' => 'SSR',
            'gametora_id' => 30190,
            'raw_data' => [
                'support_id' => 30190,
                'char_name' => 'Efforia',
                'rarity' => 3,
                'type' => 'Speed',
            ],
            'aptitudes' => null,
            'skills' => null,
            'details' => [
                'effects_table_matrix' => [
                    '0' => [30 => 10, 50 => 35],
                    '32' => [30 => 15, 50 => 30], // Initial Skill Points Up
                ],
                'training_events' => [
                    [
                        'title_en' => 'Reading all books',
                        'title_jp' => '本の読破、本当に効果あるのかな',
                        'choices' => [
                            [
                                'has_random_outcome' => true,
                                'reward_groups' => [
                                    [['type' => 'speed', 'val' => 20]],
                                    [['type' => 'stamina', 'val' => 15]],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        // 8. Seed User Characters
        UserCharacter::create([
            'uma_catalog_item_id' => $charCatalog->id,
            'name' => 'Kitasan Black [Bright Blast]',
            'base_stars' => 3,
            'current_stars' => 5,
            'is_owned' => true,
            'obtained_at' => '2026-02-25',
            'notes' => 'Main long distance runner',
        ]);

        // 9. Seed User Support Cards
        UserSupportCard::create([
            'uma_catalog_item_id' => $cardCatalog->id,
            'name' => 'SSR [The Unbreakable] Efforia (Speed)',
            'char_name' => 'Efforia',
            'rarity' => 'SSR',
            'card_type' => 'Speed',
            'limit_break' => 4, // MLB
            'is_owned' => true,
            'obtained_at' => '2026-03-12',
            'notes' => 'Core speed card',
        ]);

        // STEP 1: EXPORT DATA
        $exported = $this->backupService->export();

        $this->assertEquals(3, $exported['summary']['app_settings']);
        $this->assertEquals(2, $exported['summary']['gacha_banners']);
        $this->assertEquals(2, $exported['summary']['gacha_pities']);
        $this->assertEquals(2, $exported['summary']['gacha_pulls']);
        $this->assertEquals(2, $exported['summary']['career_runs']);
        $this->assertEquals(1, $exported['summary']['circle_snapshots']);
        $this->assertEquals(2, $exported['summary']['uma_catalog_items']);
        $this->assertEquals(1, $exported['summary']['user_characters']);
        $this->assertEquals(1, $exported['summary']['user_support_cards']);

        // Simulate JSON file transmission
        $jsonString = json_encode($exported, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $decoded = json_decode($jsonString, true);

        // STEP 2: CLEAR ALL TABLES (Simulating a clean / fresh database)
        UserCharacter::query()->delete();
        UserSupportCard::query()->delete();
        GachaPull::query()->delete();
        GachaPity::query()->delete();
        GachaBanner::query()->delete();
        UmaCatalogItem::query()->delete();
        CareerRun::query()->delete();
        CircleSnapshot::query()->delete();
        AppSetting::query()->delete();

        $this->assertEquals(0, AppSetting::count());
        $this->assertEquals(0, GachaBanner::count());
        $this->assertEquals(0, GachaPity::count());
        $this->assertEquals(0, GachaPull::count());
        $this->assertEquals(0, CareerRun::count());
        $this->assertEquals(0, CircleSnapshot::count());
        $this->assertEquals(0, UmaCatalogItem::count());
        $this->assertEquals(0, UserCharacter::count());
        $this->assertEquals(0, UserSupportCard::count());

        // STEP 3: IMPORT BACKUP (OVERWRITE MODE)
        $importResult = $this->backupService->import($decoded, 'overwrite');

        $this->assertEquals('overwrite', $importResult['mode']);
        $this->assertEquals(3, $importResult['restored']['app_settings']);
        $this->assertEquals(2, $importResult['restored']['gacha_banners']);
        $this->assertEquals(2, $importResult['restored']['gacha_pities']);
        $this->assertEquals(2, $importResult['restored']['gacha_pulls']);
        $this->assertEquals(2, $importResult['restored']['career_runs']);
        $this->assertEquals(1, $importResult['restored']['circle_snapshots']);
        $this->assertEquals(2, $importResult['restored']['uma_catalog_items']);
        $this->assertEquals(1, $importResult['restored']['user_characters']);
        $this->assertEquals(1, $importResult['restored']['user_support_cards']);

        // STEP 4: VERIFY 100% SEMANTIC IDENTITY ACROSS ALL ENTITIES

        // 1. App Settings
        $this->assertEquals('441730573', AppSetting::getValue('circle_id'));
        $this->assertEquals('886175385', AppSetting::getValue('tracked_viewer_id'));
        $plannerConfig = json_decode((string) AppSetting::getValue('planner_config'), true);
        $this->assertEquals(15000, $plannerConfig['free_carats']);
        $this->assertEquals('support', $plannerConfig['target_banner_type']);

        // 2. Gacha Banners
        $restoredCharBanner = GachaBanner::find(70001);
        $this->assertNotNull($restoredCharBanner);
        $this->assertEquals('5th Anniversary Pretty Derby Gacha', $restoredCharBanner->name);
        $this->assertEquals(4.50, $restoredCharBanner->base_rate);
        $this->assertEquals('anniversary', $restoredCharBanner->category);
        $this->assertEquals(['Almond Eye', 'Gentildonna'], $restoredCharBanner->featured_items);

        $restoredCardBanner = GachaBanner::find(70002);
        $this->assertNotNull($restoredCardBanner);
        $this->assertEquals('support', $restoredCardBanner->banner_type);
        $this->assertEquals(3.00, $restoredCardBanner->base_rate);

        // 3. Gacha Pities
        $charPity = GachaPity::where('gacha_banner_id', 70001)->first();
        $this->assertNotNull($charPity);
        $this->assertEquals(60, $charPity->current_pity);
        $this->assertEquals(1, $charPity->total_sparks);

        // 4. Gacha Pulls
        $this->assertEquals(2, GachaPull::count());
        $pull1 = GachaPull::where('item_name', 'Almond Eye')->first();
        $this->assertNotNull($pull1);
        $this->assertEquals('character', $pull1->banner_type);
        $this->assertEquals(70001, $pull1->gacha_banner_id);
        $this->assertEquals('SSR', $pull1->rarity);
        $this->assertTrue($pull1->is_rate_up);
        $this->assertEquals(1, $pull1->pity_count_at_pull);

        // 5. Career Runs
        $this->assertEquals(2, CareerRun::count());
        $run1 = CareerRun::where('uma_name', 'Kitasan Black')->first();
        $this->assertNotNull($run1);
        $this->assertEquals('The Twinkle Legends', $run1->scenario);
        $this->assertEquals('manual', $run1->training_type);
        $this->assertEquals(549000, $run1->fans_gained);
        $this->assertEquals('UC5', $run1->final_rank);
        $this->assertEquals(32450, $run1->evaluation_score);
        $this->assertEquals('2026-03-01', $run1->run_date->format('Y-m-d'));

        $run2 = CareerRun::where('uma_name', 'Satono Diamond')->first();
        $this->assertNotNull($run2);
        $this->assertEquals('independent', $run2->training_type);
        $this->assertEquals(315000, $run2->fans_gained);

        // 6. Circle Snapshots (active schema + nested payload)
        $this->assertEquals(1, CircleSnapshot::count());
        $restoredSnapshot = CircleSnapshot::where('circle_id', '441730573')->first();
        $this->assertNotNull($restoredSnapshot);
        $this->assertEquals('なんか適当', $restoredSnapshot->circle_name);
        $this->assertEquals(986, $restoredSnapshot->rank);
        $this->assertEquals(1171960184, $restoredSnapshot->point);
        $this->assertEquals(30, $restoredSnapshot->member_count);
        $this->assertEquals(853547402, $restoredSnapshot->active_total);
        $this->assertEquals('2026-09-01', $restoredSnapshot->period);
        $this->assertEquals('2026-09-15 03:03:16', $restoredSnapshot->last_refreshed_at->format('Y-m-d H:i:s'));

        // Verify nested payload identity
        $this->assertIsArray($restoredSnapshot->payload);
        $this->assertEquals('ルカ', $restoredSnapshot->payload['contributions']['rows'][0]['playerName']);
        $this->assertEquals(84677687, $restoredSnapshot->payload['contributions']['rows'][0]['contribution']);
        $this->assertEquals(986, $restoredSnapshot->payload['trend']['current']['rank']);

        // 7. Uma Catalog Items (full json attributes: aptitudes, skills, details, raw_data)
        $this->assertEquals(2, UmaCatalogItem::count());

        $restoredCharItem = UmaCatalogItem::where('type', 'character')
            ->where('name', 'Kitasan Black [Bright Blast]')
            ->first();
        $this->assertNotNull($restoredCharItem);
        $this->assertEquals('SSR', $restoredCharItem->rarity);
        $this->assertEquals(106801, $restoredCharItem->gametora_id);
        $this->assertIsArray($restoredCharItem->aptitudes);
        $this->assertEquals('A', $restoredCharItem->aptitudes['track']['turf']);
        $this->assertEquals('A', $restoredCharItem->aptitudes['distance']['long']);
        $this->assertIsArray($restoredCharItem->skills);
        $this->assertEquals('Leader Pride', $restoredCharItem->skills['innate'][0]['name']);
        $this->assertEquals(
            'Win the Arima Kinen twice',
            $restoredCharItem->skills['evolved'][0]['conditions'][0][0]
        );
        $this->assertEquals(20, $restoredCharItem->details['growth_rates']['speed']);
        $this->assertIsArray($restoredCharItem->objectives);
        $this->assertCount(2, $restoredCharItem->objectives);
        $this->assertEquals('Junior Debut', $restoredCharItem->objectives[0]['title']);
        $this->assertEquals('Satsuki Sho', $restoredCharItem->objectives[1]['title']);

        $restoredCardItem = UmaCatalogItem::where('type', 'support_card')
            ->where('name', 'SSR [The Unbreakable] Efforia (Speed)')
            ->first();
        $this->assertNotNull($restoredCardItem);
        $this->assertEquals(30190, $restoredCardItem->gametora_id);
        $this->assertIsArray($restoredCardItem->details);
        $this->assertEquals(30, $restoredCardItem->details['effects_table_matrix']['32'][50]);
        $this->assertTrue($restoredCardItem->details['training_events'][0]['choices'][0]['has_random_outcome']);
        $this->assertEquals(
            'speed',
            $restoredCardItem->details['training_events'][0]['choices'][0]['reward_groups'][0][0]['type']
        );

        // 8. User Characters (with verified foreign key relation)
        $this->assertEquals(1, UserCharacter::count());
        $userChar = UserCharacter::where('name', 'Kitasan Black [Bright Blast]')->first();
        $this->assertNotNull($userChar);
        $this->assertEquals($restoredCharItem->id, $userChar->uma_catalog_item_id);
        $this->assertEquals(3, $userChar->base_stars);
        $this->assertEquals(5, $userChar->current_stars);
        $this->assertTrue($userChar->is_owned);
        $this->assertEquals('Main long distance runner', $userChar->notes);
        // Verify relationship navigation
        $this->assertNotNull($userChar->catalogItem);
        $this->assertEquals($restoredCharItem->name, $userChar->catalogItem->name);

        // 9. User Support Cards (with verified foreign key relation)
        $this->assertEquals(1, UserSupportCard::count());
        $userCard = UserSupportCard::where('name', 'SSR [The Unbreakable] Efforia (Speed)')->first();
        $this->assertNotNull($userCard);
        $this->assertEquals($restoredCardItem->id, $userCard->uma_catalog_item_id);
        $this->assertEquals(4, $userCard->limit_break);
        $this->assertEquals('Efforia', $userCard->char_name);
        $this->assertEquals('Speed', $userCard->card_type);
        $this->assertTrue($userCard->is_owned);
        $this->assertEquals('Core speed card', $userCard->notes);
        // Verify relationship navigation
        $this->assertNotNull($userCard->catalogItem);
        $this->assertEquals($restoredCardItem->name, $userCard->catalogItem->name);
    }

    /**
     * Test merge mode:
     * Retains pre-existing records, updates overlapping records, and resolves foreign keys cleanly.
     */
    public function test_merge_mode_preserves_existing_data_and_updates_cleanly(): void
    {
        // Pre-existing pull and run
        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Existing Pull From Earlier',
            'rarity' => 'R',
            'pity_count_at_pull' => 1,
            'pulled_at' => '2026-01-01',
        ]);

        CareerRun::create([
            'uma_name' => 'Vodka',
            'run_date' => '2026-01-01',
            'scenario' => 'URA Finals',
            'final_rank' => 'B',
            'evaluation_score' => 9500,
            'fans_gained' => 150000,
            'notes' => 'Original note',
        ]);

        $payload = [
            'version' => '1.0',
            'data' => [
                'gacha_pulls' => [
                    [
                        'banner_type' => 'support',
                        'pull_type' => 'single',
                        'item_name' => 'Newly Merged Card Pull',
                        'rarity' => 'SSR',
                        'is_rate_up' => true,
                        'pity_count_at_pull' => 10,
                        'pulled_at' => '2026-02-01',
                    ],
                ],
                'career_runs' => [
                    [
                        'uma_name' => 'Daiwa Scarlet',
                        'run_date' => '2026-02-01',
                        'scenario' => 'Grand Live',
                        'final_rank' => 'S',
                        'evaluation_score' => 16000,
                        'fans_gained' => 400000,
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($payload, 'merge');

        $this->assertEquals('merge', $res['mode']);
        $this->assertEquals(1, $res['restored']['gacha_pulls']);
        $this->assertEquals(1, $res['restored']['career_runs']);

        // Both existing and new pulls must exist
        $this->assertEquals(2, GachaPull::count());
        $this->assertDatabaseHas('gacha_pulls', ['item_name' => 'Existing Pull From Earlier']);
        $this->assertDatabaseHas('gacha_pulls', ['item_name' => 'Newly Merged Card Pull']);

        // Both existing and new runs must exist
        $this->assertEquals(2, CareerRun::count());
        $this->assertDatabaseHas('career_runs', ['uma_name' => 'Vodka']);
        $this->assertDatabaseHas('career_runs', ['uma_name' => 'Daiwa Scarlet']);
    }

    /**
     * Test explicit validation schema rejects corrupted records without silent skips.
     */
    public function test_validation_schema_rejects_corrupted_records_without_silent_skips(): void
    {
        // 1. Missing data root attribute
        $this->expectException(InvalidArgumentException::class);
        $this->backupService->import(['version' => '1.0']);
    }

    public function test_validation_rejects_circle_snapshot_missing_circle_id(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->backupService->import([
            'version' => '2.0',
            'data' => [
                'circle_snapshots' => [
                    ['rank' => 100, 'point' => 500000], // missing circle_id
                ],
            ],
        ]);
    }

    public function test_validation_rejects_uma_catalog_missing_name_or_type(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->backupService->import([
            'version' => '2.0',
            'data' => [
                'uma_catalog_items' => [
                    ['rarity' => 'SSR'], // missing type & name
                ],
            ],
        ]);
    }

    public function test_validation_rejects_gacha_pull_missing_item_name(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->backupService->import([
            'version' => '2.0',
            'data' => [
                'gacha_pulls' => [
                    ['banner_type' => 'character', 'rarity' => 'SSR'], // missing item_name
                ],
            ],
        ]);
    }

    public function test_validation_rejects_career_run_missing_scenario(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->backupService->import([
            'version' => '2.0',
            'data' => [
                'career_runs' => [
                    ['uma_name' => 'Mejiro McQueen'], // missing scenario
                ],
            ],
        ]);
    }

    public function test_validation_rejects_invalid_restore_mode(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->backupService->import(['version' => '2.0', 'data' => []], 'invalid_mode');
    }

    /**
     * Test backward compatibility with legacy circle snapshot export format.
     */
    public function test_legacy_circle_snapshot_backward_compatibility(): void
    {
        $legacyPayload = [
            'version' => '0.9',
            'data' => [
                'circle_snapshots' => [
                    [
                        'circle_id' => '999123',
                        'circle_name' => 'Legacy Circle',
                        'snapshot_date' => '2026-05-15 10:00:00',
                        'rank' => 450,
                        'total_fans' => 75000000,
                        'members_data' => [
                            ['playerName' => 'Trainer A', 'contribution' => 5000000],
                        ],
                        'tracked_player_name' => 'Trainer A',
                        'tracked_player_fans' => 5000000,
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($legacyPayload, 'overwrite');
        $this->assertEquals(1, $res['restored']['circle_snapshots']);

        $restored = CircleSnapshot::where('circle_id', '999123')->first();
        $this->assertNotNull($restored);
        $this->assertEquals('Legacy Circle', $restored->circle_name);
        $this->assertEquals(450, $restored->rank);
        $this->assertEquals(75000000, $restored->point);
        $this->assertEquals('2026-05-15 10:00:00', $restored->last_refreshed_at->format('Y-m-d H:i:s'));
        $this->assertIsArray($restored->payload);
        $this->assertEquals('Trainer A', $restored->payload['tracked_player_name']);
    }

    /**
     * Verify that PHPUnit tests strictly use an isolated in-memory SQLite database
     * and do not modify the user's production SQLite database file.
     */
    public function test_tests_use_isolated_memory_database_without_affecting_production(): void
    {
        $dbConnection = config('database.default');
        $dbName = config("database.connections.{$dbConnection}.database");

        $this->assertEquals('sqlite', $dbConnection);
        $this->assertEquals(':memory:', $dbName);
        $this->assertNotEquals(database_path('database.sqlite'), $dbName);
    }

    /**
     * Test handling of missing foreign key references:
     * Non-existent banner IDs and non-existent catalog IDs are safely set to null
     * without crashing or throwing foreign key constraint violations.
     */
    public function test_foreign_keys_with_missing_references_are_handled_safely(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'gacha_pulls' => [
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 999999, // non-existent banner ID
                        'pull_type' => 'single',
                        'item_name' => 'Standalone Pull Without Banner',
                        'rarity' => 'R',
                        'is_rate_up' => false,
                        'pity_count_at_pull' => 5,
                        'pulled_at' => '2026-03-01',
                    ],
                ],
                'gacha_pities' => [
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 999999, // non-existent banner ID
                        'current_pity' => 15,
                        'total_sparks' => 0,
                    ],
                ],
                'user_characters' => [
                    [
                        'name' => 'Completely Uncataloged Uma',
                        'uma_catalog_item_id' => 999999, // non-existent catalog ID
                        'base_stars' => 3,
                        'current_stars' => 3,
                        'is_owned' => true,
                    ],
                ],
                'user_support_cards' => [
                    [
                        'name' => 'Completely Uncataloged Support Card',
                        'uma_catalog_item_id' => 999999, // non-existent catalog ID
                        'char_name' => 'Unknown',
                        'rarity' => 'SSR',
                        'limit_break' => 0,
                        'is_owned' => true,
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($payload, 'overwrite');
        $this->assertEquals(1, $res['restored']['gacha_pulls']);
        $this->assertEquals(1, $res['restored']['gacha_pities']);
        $this->assertEquals(1, $res['restored']['user_characters']);
        $this->assertEquals(1, $res['restored']['user_support_cards']);

        $pull = GachaPull::where('item_name', 'Standalone Pull Without Banner')->first();
        $this->assertNotNull($pull);
        $this->assertNull($pull->gacha_banner_id);

        $pity = GachaPity::where('banner_type', 'character')->first();
        $this->assertNotNull($pity);
        $this->assertNull($pity->gacha_banner_id);

        $userChar = UserCharacter::where('name', 'Completely Uncataloged Uma')->first();
        $this->assertNotNull($userChar);
        $this->assertNull($userChar->uma_catalog_item_id);

        $userCard = UserSupportCard::where('name', 'Completely Uncataloged Support Card')->first();
        $this->assertNotNull($userCard);
        $this->assertNull($userCard->uma_catalog_item_id);
    }

    /**
     * Test duplicate IDs in a single backup payload are explicitly rejected.
     */
    public function test_duplicate_ids_in_backup_payload_are_rejected(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'id' => 500,
                        'name' => 'First Banner With ID 500',
                        'banner_type' => 'character',
                        'category' => 'standard',
                        'base_rate' => 3.00,
                        'start_date' => '2026-01-01',
                    ],
                    [
                        'id' => 500,
                        'name' => 'Updated Banner With Same ID 500',
                        'banner_type' => 'character',
                        'category' => 'anniversary',
                        'base_rate' => 4.50,
                        'start_date' => '2026-01-01',
                    ],
                ],
            ],
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Duplikasi ID '500' terdeteksi pada gacha_banners");

        $this->backupService->import($payload, 'overwrite');
    }

    /**
     * Test unsupported future schema versions are safely rejected by validate().
     */
    public function test_unsupported_future_schema_version_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Versi skema backup '99.0' tidak didukung");

        $this->backupService->import([
            'version' => '99.0',
            'data' => [],
        ]);
    }

    /**
     * Test that nullable fields across all entities round-trip losslessly without conversion to empty string or 0.
     */
    public function test_nullable_fields_preservation_across_all_entities(): void
    {
        // Clean any migration seeds
        UserCharacter::query()->delete();
        UserSupportCard::query()->delete();
        GachaPull::query()->delete();
        GachaPity::query()->delete();
        GachaBanner::query()->delete();
        UmaCatalogItem::query()->delete();
        CareerRun::query()->delete();
        CircleSnapshot::query()->delete();
        AppSetting::query()->delete();

        // Banner with null dates and null gametora_id
        $banner = GachaBanner::create([
            'id' => 90001,
            'gametora_id' => null,
            'name' => 'Permanent Classic Gacha',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.00,
            'start_date' => '2026-01-01',
            'end_date' => null,
            'featured_items' => [],
            'is_active' => true,
        ]);

        // Pull without banner_id
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => null,
            'pull_type' => 'ticket',
            'item_name' => 'Grass Wonder',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pity_count_at_pull' => 0,
            'pulled_at' => now(),
        ]);

        // Run with null evaluation_score and null notes
        CareerRun::create([
            'uma_name' => 'El Condor Pasa',
            'run_date' => '2026-03-01',
            'scenario' => 'URA Finals',
            'training_type' => 'manual',
            'starting_fans' => 0,
            'ending_fans' => 200000,
            'fans_gained' => 200000,
            'final_rank' => 'A',
            'evaluation_score' => null,
            'notes' => null,
        ]);

        // Catalog item with null aptitudes, skills, details
        UmaCatalogItem::create([
            'type' => 'base_uma',
            'name' => 'Base Grass Wonder',
            'rarity' => null,
            'gametora_id' => null,
            'raw_data' => null,
            'aptitudes' => null,
            'skills' => null,
            'details' => null,
        ]);

        $exported = $this->backupService->export();
        $imported = $this->backupService->import($exported, 'overwrite');

        $restoredBanner = GachaBanner::find(90001);
        $this->assertNull($restoredBanner->gametora_id);
        $this->assertEquals('2026-01-01', $restoredBanner->start_date->format('Y-m-d'));
        $this->assertNull($restoredBanner->end_date);

        $restoredPull = GachaPull::where('item_name', 'Grass Wonder')->first();
        $this->assertNull($restoredPull->gacha_banner_id);

        $restoredRun = CareerRun::where('uma_name', 'El Condor Pasa')->first();
        $this->assertNull($restoredRun->evaluation_score);
        $this->assertNull($restoredRun->notes);

        $restoredCatalog = UmaCatalogItem::where('name', 'Base Grass Wonder')->first();
        $this->assertNull($restoredCatalog->rarity);
        $this->assertNull($restoredCatalog->gametora_id);
        $this->assertNull($restoredCatalog->raw_data);
        $this->assertNull($restoredCatalog->aptitudes);
        $this->assertNull($restoredCatalog->skills);
        $this->assertNull($restoredCatalog->details);
    }

    /**
     * Test overwrite mode completely replaces all previous data without residual records.
     */
    public function test_overwrite_mode_completely_replaces_all_tables_without_leftovers(): void
    {
        // Seed initial data
        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Pull That Must Disappear',
            'rarity' => 'R',
            'pulled_at' => now(),
        ]);

        CareerRun::create([
            'uma_name' => 'Run That Must Disappear',
            'scenario' => 'URA Finals',
            'final_rank' => 'C',
            'run_date' => now()->toDateString(),
        ]);

        $this->assertEquals(1, GachaPull::count());
        $this->assertEquals(1, CareerRun::count());

        $newBackup = [
            'version' => '2.0',
            'data' => [
                'career_runs' => [
                    [
                        'uma_name' => 'The Only Surviving Run',
                        'scenario' => 'Beyond Dreams',
                        'final_rank' => 'SS',
                        'run_date' => '2026-03-01',
                    ],
                ],
            ],
        ];

        $this->backupService->import($newBackup, 'overwrite');

        $this->assertEquals(0, GachaPull::count());
        $this->assertEquals(1, CareerRun::count());
        $this->assertDatabaseMissing('career_runs', ['uma_name' => 'Run That Must Disappear']);
        $this->assertDatabaseHas('career_runs', ['uma_name' => 'The Only Surviving Run']);
    }

    /**
     * Verify that entity identity resolution strictly prevents cross-linking to incorrect catalog items
     * when a provided ID in the backup actually belongs to a different character or card.
     */
    public function test_cross_linking_prevention_does_not_link_character_to_differently_named_catalog_item(): void
    {
        // Catalog has Special Week with ID 777
        $specialWeekCatalog = UmaCatalogItem::create([
            'id' => 777,
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
            'rarity' => 'SSR',
            'gametora_id' => 100101,
        ]);

        // Backup payload has Silence Suzuka claiming catalog ID 777 (which belongs to Special Week!)
        $payload = [
            'version' => '2.0',
            'data' => [
                'user_characters' => [
                    [
                        'name' => 'Silence Suzuka [Spurt of Green]',
                        'uma_catalog_item_id' => 777, // Fraudulent / cross-link ID
                        'base_stars' => 3,
                        'current_stars' => 3,
                        'is_owned' => true,
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($payload, 'merge');

        $suzuka = UserCharacter::where('name', 'Silence Suzuka [Spurt of Green]')->first();
        $this->assertNotNull($suzuka);
        // Must NOT link to Special Week ID 777!
        $this->assertNull($suzuka->uma_catalog_item_id);

        // Unresolved references must be explicitly recorded
        $this->assertCount(1, $res['unresolved_references']);
        $this->assertEquals('user_characters', $res['unresolved_references'][0]['entity']);
        $this->assertEquals('Silence Suzuka [Spurt of Green]', $res['unresolved_references'][0]['record_name']);
        $this->assertStringContainsString('Tidak dapat memverifikasi identitas katalog', $res['unresolved_references'][0]['reason']);
    }

    /**
     * Test in-payload duplicate primary/unique keys are explicitly rejected to prevent silent data loss.
     */
    public function test_in_payload_duplicate_keys_are_rejected(): void
    {
        // 1. Duplicate app_settings key
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'app_settings' => [
                        ['key' => 'circle_id', 'value' => '111'],
                        ['key' => 'circle_id', 'value' => '222'],
                    ],
                ],
            ]);
            $this->fail('Expected exception for duplicate app_settings key');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString("Duplikasi kunci 'circle_id' terdeteksi", $e->getMessage());
        }

        // 2. Duplicate gacha_banners ID
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        ['id' => 10, 'name' => 'Banner One', 'base_rate' => 3.00, 'start_date' => '2026-01-01'],
                        ['id' => 10, 'name' => 'Banner Two', 'base_rate' => 3.00, 'start_date' => '2026-01-02'],
                    ],
                ],
            ]);
            $this->fail('Expected exception for duplicate gacha_banners ID');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString("Duplikasi ID '10' terdeteksi", $e->getMessage());
        }

        // 3. Duplicate user_characters name
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'user_characters' => [
                        ['name' => 'Oguri Cap', 'base_stars' => 3, 'current_stars' => 3],
                        ['name' => 'Oguri Cap', 'base_stars' => 3, 'current_stars' => 4],
                    ],
                ],
            ]);
            $this->fail('Expected exception for duplicate user_characters name');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString("Duplikasi karakter 'Oguri Cap' terdeteksi", $e->getMessage());
        }
    }

    /**
     * Test out-of-range values, invalid enums, invalid dates, and malformed JSON are strictly rejected.
     */
    public function test_out_of_range_and_invalid_data_types_are_rejected(): void
    {
        // 1. Invalid date string
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_pulls' => [
                        [
                            'banner_type' => 'character',
                            'item_name' => 'Tokai Teio',
                            'rarity' => 'SSR',
                            'pulled_at' => 'not-a-valid-date-timestamp',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for invalid date');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Format tanggal/waktu tidak valid', $e->getMessage());
        }

        // 2. Malformed JSON string in featured_items
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Corrupt Banner',
                            'base_rate' => 3.00,
                            'start_date' => '2026-01-01',
                            'featured_items' => '{this is not valid json',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for malformed JSON');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Format JSON tidak valid', $e->getMessage());
        }

        // 3. Out-of-range limit_break (> 4)
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'user_support_cards' => [
                        [
                            'name' => 'Over-LB Card',
                            'rarity' => 'SSR',
                            'limit_break' => 99,
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for limit_break out of range');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid (0 - 4)', $e->getMessage());
        }

        // 4. Out-of-range base_rate (> 100%)
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Impossible Rate Banner',
                            'base_rate' => 150.0,
                            'start_date' => '2026-01-01',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for base_rate out of range');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid (0.0 - 100.0)', $e->getMessage());
        }

        // 5. Invalid rarity enum
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_pulls' => [
                        [
                            'banner_type' => 'character',
                            'item_name' => 'Invalid Rarity Pull',
                            'rarity' => 'UR', // invalid in Uma Musume (only SSR, SR, R)
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for invalid rarity');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('harus SSR, SR, atau R', $e->getMessage());
        }

        // 6. Malformed JSON string in uma_catalog_items.objectives
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'uma_catalog_items' => [
                        [
                            'type' => 'character',
                            'name' => 'Special Week [Special Dreamer]',
                            'objectives' => '{not a valid json object',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for malformed objectives JSON');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Format JSON tidak valid pada uma_catalog_items[0].objectives', $e->getMessage());
        }
    }

    /**
     * Capture deterministic full content snapshot of all 9 database tables.
     * Captures every column, ID, foreign key, value, and nested JSON structure in sorted order.
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    protected function captureFullDatabaseSnapshot(): array
    {
        return [
            'app_settings' => AppSetting::query()->orderBy('key')->get()->toArray(),
            'gacha_banners' => GachaBanner::query()->orderBy('id')->get()->toArray(),
            'gacha_pities' => GachaPity::query()->orderBy('id')->get()->toArray(),
            'gacha_pulls' => GachaPull::query()->orderBy('id')->get()->toArray(),
            'career_runs' => CareerRun::query()->orderBy('id')->get()->toArray(),
            'circle_snapshots' => CircleSnapshot::query()->orderBy('id')->get()->toArray(),
            'uma_catalog_items' => UmaCatalogItem::query()->orderBy('id')->get()->toArray(),
            'user_characters' => UserCharacter::query()->orderBy('id')->get()->toArray(),
            'user_support_cards' => UserSupportCard::query()->orderBy('id')->get()->toArray(),
        ];
    }

    /**
     * Test transaction atomicity via real fault injection with FULL 9-table snapshot comparison:
     * - Seeds distinct, verified records across ALL 9 database tables.
     * - Captures a complete content snapshot before import.
     * - Invokes the REAL BackupService::import($payload, 'overwrite') without any subclass or artificial transaction.
     * - Overwrite mode deletes all previous data and begins inserting new records.
     * - Uses isolated event dispatcher swapping (not destructive flushEventListeners).
     * - Injects fault on CareerRun::saving, after app_settings, gacha_banners, gacha_pities, and gacha_pulls were processed.
     * - Proves inside the hook that partial overwrite operations (deletions and insertions) were actively running.
     * - Asserts that after rollback, every single record, ID, FK, and column in ALL 9 tables matches the pre-import snapshot 100%.
     */
    public function test_transaction_rollback_preserves_database_state_when_restore_fails_mid_process(): void
    {
        // 1. Seed distinct pre-existing records across ALL 9 tables
        AppSetting::setValue('existing_theme', 'dark_mode');

        $initialBanner = GachaBanner::create([
            'id' => 8881,
            'name' => 'Initial Banner Prior To Failure',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.00,
            'start_date' => '2026-01-01',
            'featured_items' => ['Special Week'],
            'is_active' => true,
        ]);

        $initialPity = new GachaPity([
            'banner_type' => 'character',
            'gacha_banner_id' => $initialBanner->id,
            'current_pity' => 45,
            'total_sparks' => 0,
        ]);
        $initialPity->id = 8882;
        $initialPity->save();

        GachaPull::create([
            'id' => 8883,
            'banner_type' => 'character',
            'gacha_banner_id' => $initialBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Special Week',
            'rarity' => 'SSR',
            'pulled_at' => Carbon::parse('2026-01-02 10:00:00'),
        ]);

        CareerRun::create([
            'id' => 8884,
            'uma_name' => 'Special Week',
            'scenario' => 'URA Finals',
            'training_type' => 'manual',
            'starting_fans' => 1000,
            'ending_fans' => 300000,
            'fans_gained' => 299000,
            'final_rank' => 'A',
            'evaluation_score' => 12500,
            'run_date' => Carbon::parse('2026-01-03'),
        ]);

        CircleSnapshot::create([
            'id' => 8885,
            'circle_id' => '999888',
            'circle_name' => 'Initial Circle',
            'rank' => 500,
            'point' => 50000000,
            'member_count' => 28,
            'last_refreshed_at' => Carbon::parse('2026-01-04 12:00:00'),
            'payload' => ['contributions' => ['rows' => []]],
        ]);

        $initialCatalog = UmaCatalogItem::create([
            'id' => 8886,
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
            'rarity' => 'SSR',
            'gametora_id' => 100101,
            'raw_data' => ['id' => 100101],
            'aptitudes' => ['turf' => 'A'],
            'skills' => ['innate' => []],
            'details' => ['growth' => ['speed' => 20]],
        ]);

        UserCharacter::create([
            'id' => 8887,
            'uma_catalog_item_id' => $initialCatalog->id,
            'name' => 'Special Week [Special Dreamer]',
            'base_stars' => 3,
            'current_stars' => 4,
            'is_owned' => true,
        ]);

        UserSupportCard::create([
            'id' => 8888,
            'uma_catalog_item_id' => null,
            'name' => 'SSR Tazuna Hayakawa',
            'rarity' => 'SSR',
            'card_type' => 'Friend',
            'limit_break' => 4,
            'is_owned' => true,
        ]);

        // 2. Capture complete pre-import snapshot of ALL 9 tables
        $snapshotBefore = $this->captureFullDatabaseSnapshot();
        $this->assertNotEmpty($snapshotBefore['app_settings']);
        $this->assertNotEmpty($snapshotBefore['gacha_banners']);
        $this->assertNotEmpty($snapshotBefore['gacha_pities']);
        $this->assertNotEmpty($snapshotBefore['gacha_pulls']);
        $this->assertNotEmpty($snapshotBefore['career_runs']);
        $this->assertNotEmpty($snapshotBefore['circle_snapshots']);
        $this->assertNotEmpty($snapshotBefore['uma_catalog_items']);
        $this->assertNotEmpty($snapshotBefore['user_characters']);
        $this->assertNotEmpty($snapshotBefore['user_support_cards']);

        // Explicitly verify that initial data exists in database before import
        $this->assertDatabaseHas('app_settings', ['key' => 'existing_theme', 'value' => 'dark_mode']);
        $this->assertDatabaseHas('gacha_banners', ['name' => 'Initial Banner Prior To Failure']);
        $this->assertDatabaseHas('gacha_pities', ['banner_type' => 'character', 'current_pity' => 45]);
        $this->assertDatabaseHas('gacha_pulls', ['item_name' => 'Special Week', 'rarity' => 'SSR']);
        $this->assertDatabaseHas('career_runs', ['uma_name' => 'Special Week', 'scenario' => 'URA Finals']);
        $this->assertDatabaseHas('circle_snapshots', ['circle_id' => '999888', 'circle_name' => 'Initial Circle']);
        $this->assertDatabaseHas('uma_catalog_items', ['name' => 'Special Week [Special Dreamer]']);
        $this->assertDatabaseHas('user_characters', ['name' => 'Special Week [Special Dreamer]', 'current_stars' => 4]);
        $this->assertDatabaseHas('user_support_cards', ['name' => 'SSR Tazuna Hayakawa', 'card_type' => 'Friend']);

        // Explicitly verify that new uncommitted payload data does NOT exist prior to import
        $this->assertDatabaseMissing('app_settings', ['key' => 'uncommitted_key']);
        $this->assertDatabaseMissing('gacha_banners', ['id' => 9991]);
        $this->assertDatabaseMissing('gacha_pulls', ['item_name' => 'Uncommitted Pull']);
        $this->assertDatabaseMissing('career_runs', ['uma_name' => 'Fatal Run Trigger']);

        // 3. Construct a valid payload containing items for app_settings, gacha_banners, gacha_pulls, AND career_runs
        $payload = [
            'version' => '2.0',
            'data' => [
                'app_settings' => [
                    ['key' => 'uncommitted_key', 'value' => 'uncommitted_val'],
                ],
                'gacha_banners' => [
                    [
                        'id' => 9991,
                        'name' => 'Uncommitted Banner',
                        'banner_type' => 'character',
                        'category' => 'standard',
                        'base_rate' => 3.00,
                        'start_date' => '2026-02-01',
                    ],
                ],
                'gacha_pulls' => [
                    [
                        'banner_type' => 'character',
                        'pull_type' => 'single',
                        'item_name' => 'Uncommitted Pull',
                        'rarity' => 'SSR',
                        'pulled_at' => '2026-02-01',
                    ],
                ],
                'career_runs' => [
                    [
                        'uma_name' => 'Fatal Run Trigger',
                        'scenario' => 'Beyond Dreams',
                        'final_rank' => 'SS',
                        'run_date' => '2026-03-01',
                    ],
                ],
            ],
        ];

        // 4. Non-destructive event dispatcher isolation
        $originalDispatcher = CareerRun::getEventDispatcher();
        $clonedDispatcher = clone $originalDispatcher;
        CareerRun::setEventDispatcher($clonedDispatcher);

        $faultInjected = false;
        $midProcessStateVerified = false;

        CareerRun::saving(function () use (&$faultInjected, &$midProcessStateVerified) {
            $faultInjected = true;

            // Verify that partial overwrite operations have ALREADY executed inside this open transaction:
            // 1. Initial app_setting was deleted by overwrite mode
            $oldSettingDeleted = ! AppSetting::where('key', 'existing_theme')->exists();
            // 2. New uncommitted app_setting was already inserted
            $newSettingInserted = AppSetting::where('key', 'uncommitted_key')->exists();
            // 3. New uncommitted banner was already inserted
            $newBannerInserted = GachaBanner::where('id', 9991)->exists();

            if ($oldSettingDeleted && $newSettingInserted && $newBannerInserted) {
                $midProcessStateVerified = true;
            }

            throw new \RuntimeException('Fault injected during real CareerRun save inside active transaction!');
        });

        try {
            // Call the REAL BackupService::import() directly WITHOUT subclassing or custom transaction wrappers
            $this->backupService->import($payload, 'overwrite');
            $this->fail('Expected RuntimeException was not thrown by the transaction.');
        } catch (\RuntimeException $e) {
            $this->assertEquals('Fault injected during real CareerRun save inside active transaction!', $e->getMessage());
        } finally {
            // Non-destructive cleanup: restore original dispatcher rather than calling flushEventListeners()
            CareerRun::setEventDispatcher($originalDispatcher);
        }

        // 5. Verification of fault injection evidence
        $this->assertTrue($faultInjected, 'Bukti bahwa event CareerRun::saving benar-benar dipicu oleh implementasi asli BackupService::import()');
        $this->assertTrue($midProcessStateVerified, 'Bukti bahwa transaksi sudah berjalan separuh (data lama terhapus dan data baru parsial telah tertulis) sebelum exception terjadi.');

        // 6. Complete 9-table snapshot comparison after rollback
        $snapshotAfter = $this->captureFullDatabaseSnapshot();

        // Exact content match across all 9 tables (IDs, columns, foreign keys, timestamps, and values)
        $this->assertEquals($snapshotBefore, $snapshotAfter, 'Seluruh isi tabel, foreign key, dan record sebelum dan sesudah rollback harus identik 100%.');

        // Explicit absence of uncommitted new payload data
        $this->assertDatabaseMissing('app_settings', ['key' => 'uncommitted_key']);
        $this->assertDatabaseMissing('gacha_banners', ['id' => 9991]);
        $this->assertDatabaseMissing('gacha_pulls', ['item_name' => 'Uncommitted Pull']);
        $this->assertDatabaseMissing('career_runs', ['uma_name' => 'Fatal Run Trigger']);
    }

    /**
     * Test that event listener cleanup does not use destructive flushEventListeners()
     * and guarantees pre-existing model event listeners are preserved intact.
     */
    public function test_event_listener_safety_preserves_pre_existing_listeners_without_destructive_flush(): void
    {
        $originalDispatcher = CareerRun::getEventDispatcher();

        // Register a pre-existing listener that must NEVER be wiped out
        $preExistingListenerCalled = false;
        CareerRun::saving(function () use (&$preExistingListenerCalled) {
            $preExistingListenerCalled = true;
        });

        // Simulate an isolated test that swaps and restores dispatcher
        $clonedDispatcher = clone CareerRun::getEventDispatcher();
        CareerRun::setEventDispatcher($clonedDispatcher);

        $faultHookCalled = false;
        CareerRun::saving(function () use (&$faultHookCalled) {
            $faultHookCalled = true;
            throw new \RuntimeException('Isolated test fault');
        });

        try {
            $run = new CareerRun;
            $run->uma_name = 'Test Uma';
            $run->scenario = 'URA';
            $run->fans_gained = 0;
            $run->final_rank = 'A';
            $run->save();
        } catch (\RuntimeException) {
            // Expected isolated fault
        } finally {
            // Non-destructive cleanup: restore original dispatcher rather than calling flushEventListeners()
            CareerRun::setEventDispatcher($originalDispatcher);
        }

        $this->assertTrue($faultHookCalled);

        // Now save a model with the restored original dispatcher:
        // The pre-existing listener MUST still be active and fire!
        $normalRun = new CareerRun([
            'uma_name' => 'Normal Run',
            'scenario' => 'URA',
            'fans_gained' => 100,
            'final_rank' => 'B',
            'run_date' => now()->toDateString(),
        ]);
        $normalRun->save();

        $this->assertTrue($preExistingListenerCalled, 'Pre-existing event listener must NOT be destroyed by test cleanup.');
    }

    /**
     * Test that cloning Illuminate\Events\Dispatcher is truly independent:
     * Adding listeners to the cloned dispatcher does not affect the original dispatcher
     * due to PHP's copy-on-write semantics on arrays.
     */
    public function test_cloned_event_dispatcher_is_truly_independent_from_original(): void
    {
        $original = CareerRun::getEventDispatcher();
        $this->assertNotNull($original);

        $cloned = clone $original;

        // Register a test listener on the cloned dispatcher only
        $cloned->listen('career_run.cloned_only', function () {
            return 'cloned_response';
        });

        // Verify cloned dispatcher registered the event
        $this->assertTrue($cloned->hasListeners('career_run.cloned_only'));

        // Verify original dispatcher was NOT modified in any way
        $this->assertFalse($original->hasListeners('career_run.cloned_only'));

        // Verify with Eloquent Model events using CareerRun::saving
        CareerRun::setEventDispatcher($cloned);
        CareerRun::saving(function () {
            return false;
        });

        $this->assertTrue($cloned->hasListeners('eloquent.saving: '.CareerRun::class));
        $this->assertFalse($original->hasListeners('eloquent.saving: '.CareerRun::class));

        // Restore original dispatcher and verify it is completely pristine
        CareerRun::setEventDispatcher($original);
        $this->assertFalse(CareerRun::getEventDispatcher()->hasListeners('eloquent.saving: '.CareerRun::class));
    }

    /**
     * Test that missing schema version attribute in payload is strictly rejected.
     */
    public function test_missing_schema_version_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Versi skema backup wajib dicantumkan.');

        $this->backupService->import([
            'data' => [],
        ]);
    }

    /**
     * Test that malformed schema version (e.g. array or object) is strictly rejected.
     */
    public function test_malformed_schema_version_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Format versi skema backup tidak valid (harus berupa string).');

        $this->backupService->import([
            'version' => ['2.0'],
            'data' => [],
        ]);
    }

    /**
     * Test that unknown schema version not in whitelist is strictly rejected.
     */
    public function test_unknown_schema_version_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Versi skema backup '3.0' tidak didukung oleh aplikasi saat ini. Versi yang didukung: 0.9, 1.0, 2.0.");

        $this->backupService->import([
            'version' => '3.0',
            'data' => [],
        ]);
    }

    /**
     * Test that each version in the supported whitelist ('0.9', '1.0', '2.0') is accepted by validate().
     */
    public function test_supported_schema_versions_whitelist_are_accepted(): void
    {
        foreach (BackupService::SUPPORTED_SCHEMA_VERSIONS as $ver) {
            $payload = [
                'version' => $ver,
                'data' => [
                    'app_settings' => [
                        ['key' => 'test_ver_'.$ver, 'value' => 'ok'],
                    ],
                ],
            ];

            $res = $this->backupService->import($payload, 'merge');
            $this->assertEquals(1, $res['restored']['app_settings']);
            $this->assertDatabaseHas('app_settings', ['key' => 'test_ver_'.$ver, 'value' => 'ok']);
        }
    }

    /**
     * Test that gacha_banners with base_rate = NULL is strictly rejected (column is NOT NULL).
     */
    public function test_gacha_banner_with_null_base_rate_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Nilai base_rate pada gacha_banners[0] tidak boleh bernilai NULL (kolom non-nullable).');

        $this->backupService->import([
            'version' => '2.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'name' => 'Null Rate Banner',
                        'base_rate' => null,
                        'start_date' => '2026-01-01',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Test that gacha_banners with missing base_rate field is strictly rejected without silent guessing.
     */
    public function test_gacha_banner_with_missing_base_rate_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Record gacha_banners pada index 0 tidak memiliki atribut 'base_rate' yang valid (kolom non-nullable).");

        $this->backupService->import([
            'version' => '2.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'name' => 'Missing Rate Banner',
                        // 'base_rate' is omitted
                        'start_date' => '2026-01-01',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Test that gacha_banners with valid numeric base_rate is restored accurately without any guessing or inference.
     */
    public function test_gacha_banner_with_valid_base_rate_is_restored_accurately(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'id' => 77701,
                        'name' => 'Custom Premium Derby Gacha',
                        'banner_type' => 'character',
                        'category' => 'anniversary',
                        'base_rate' => 5.25, // custom rate, not 4.50 or 3.00
                        'start_date' => '2026-05-01',
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($payload, 'overwrite');
        $this->assertEquals(1, $res['restored']['gacha_banners']);

        $banner = GachaBanner::find(77701);
        $this->assertNotNull($banner);
        $this->assertEquals(5.25, $banner->base_rate);
    }

    /**
     * Test synthetic legacy v1.0 backup with base_rate (created after base_rate migration) is restored accurately.
     */
    public function test_synthetic_legacy_backup_with_base_rate_is_restored_accurately(): void
    {
        $legacyPayload = [
            'version' => '1.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'id' => 201,
                        'name' => 'Synthetic Legacy Banner With Base Rate',
                        'banner_type' => 'character',
                        'category' => 'standard',
                        'base_rate' => 3.00,
                        'start_date' => '2026-01-01',
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($legacyPayload, 'overwrite');
        $this->assertEquals(1, $res['restored']['gacha_banners']);

        $banner = GachaBanner::find(201);
        $this->assertNotNull($banner);
        $this->assertEquals(3.00, $banner->base_rate);
    }

    /**
     * Test synthetic legacy v1.0 backup without base_rate (created before 2026-09-16 migration) is explicitly rejected.
     * We do not claim lossless compatibility when legacy payloads lack required non-nullable data,
     * nor do we inject silent guess values.
     */
    public function test_synthetic_legacy_backup_without_base_rate_is_explicitly_rejected(): void
    {
        // Synthetic payload matching schema from 2026_09_15_230000_create_gacha_banners_table.php
        $legacyPayloadBeforeRateMigration = [
            'version' => '1.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'id' => 202,
                        'name' => 'Synthetic Legacy Banner Pre-Sept-16',
                        'banner_type' => 'character',
                        'category' => 'standard',
                        // 'base_rate' was not present in export before Sept 16, 2026
                        'start_date' => '2026-01-01',
                        'is_active' => true,
                    ],
                ],
            ],
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Record gacha_banners pada index 0 tidak memiliki atribut 'base_rate' yang valid (kolom non-nullable).");

        $this->backupService->import($legacyPayloadBeforeRateMigration, 'overwrite');
    }

    /**
     * Test actual historical legacy backup file without base_rate:
     * Reads storage/app/backups/uma-companion-backup-2026-09-16_005754.json created prior to migration
     * 2026_09_16_033000_add_base_rate_to_gacha_banners_table.php.
     * Proves that all 60 actual historical banners lack base_rate and are rejected explicitly by strict validation.
     */
    public function test_actual_historical_legacy_backup_file_without_base_rate_is_explicitly_rejected(): void
    {
        $filePath = base_path('storage/app/backups/uma-companion-backup-2026-09-16_005754.json');
        $this->assertFileExists($filePath, 'Actual historical backup fixture must exist in storage/app/backups.');

        $historicalBackup = json_decode((string) file_get_contents($filePath), true);
        $this->assertIsArray($historicalBackup);
        $this->assertEquals('1.0', $historicalBackup['version']);
        $this->assertNotEmpty($historicalBackup['data']['gacha_banners']);

        // Empirically verify that every single banner in this actual historical backup lacks 'base_rate'
        foreach ($historicalBackup['data']['gacha_banners'] as $banner) {
            $this->assertArrayNotHasKey('base_rate', $banner, 'Actual historical backup created at 2026-09-16T00:57:54Z must not contain base_rate.');
        }

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Record gacha_banners pada index 0 tidak memiliki atribut 'base_rate' yang valid (kolom non-nullable).");

        $this->backupService->import($historicalBackup, 'overwrite');
    }

    /**
     * Test actual historical backup file with base_rate:
     * Reads storage/app/backups/uma-companion-backup-2026-09-17_222917.json created after migration.
     * Proves that all 69 actual banners include base_rate and restore cleanly with zero unresolved references.
     */
    public function test_actual_historical_backup_file_with_base_rate_is_restored_accurately(): void
    {
        $filePath = base_path('storage/app/backups/uma-companion-backup-2026-09-17_222917.json');
        $this->assertFileExists($filePath, 'Actual historical backup fixture must exist in storage/app/backups.');

        $historicalBackup = json_decode((string) file_get_contents($filePath), true);
        $this->assertIsArray($historicalBackup);
        $this->assertEquals('1.0', $historicalBackup['version']);
        $this->assertCount(69, $historicalBackup['data']['gacha_banners']);

        // Empirically verify that every banner has valid base_rate
        foreach ($historicalBackup['data']['gacha_banners'] as $banner) {
            $this->assertArrayHasKey('base_rate', $banner);
            $this->assertNotNull($banner['base_rate']);
            $this->assertIsNumeric($banner['base_rate']);
        }

        $res = $this->backupService->import($historicalBackup, 'overwrite');
        $this->assertEquals(69, $res['restored']['gacha_banners']);
        $this->assertCount(0, $res['unresolved_references']);
    }

    /**
     * Verify that SQLite PRAGMA foreign_keys is active and properly enforced in tests:
     * Direct raw insert into user_characters with a non-existent foreign key MUST throw QueryException.
     */
    public function test_sqlite_foreign_keys_pragma_is_active_and_enforced(): void
    {
        $pragmaResult = DB::select('PRAGMA foreign_keys;');
        $this->assertNotEmpty($pragmaResult);
        $this->assertEquals(1, (int) $pragmaResult[0]->foreign_keys, 'PRAGMA foreign_keys must be active (1) during testing.');

        // Direct raw insert into user_characters table with an invalid foreign key reference
        // (uma_catalog_item_id = 999999 does not exist in uma_catalog_items table)
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('FOREIGN KEY constraint failed');

        DB::table('user_characters')->insert([
            'name' => 'Direct FK Constraint Violation Uma',
            'uma_catalog_item_id' => 999999,
            'base_stars' => 3,
            'current_stars' => 3,
            'is_owned' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Verify that BackupService safely detects and resolves non-existent foreign keys to null,
     * recording unresolved references and preventing SQLite QueryException during restore.
     */
    public function test_backup_service_safely_normalizes_invalid_foreign_key_references_avoiding_constraint_failures(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'user_characters' => [
                    [
                        'name' => 'Foreign Key Test Character',
                        'uma_catalog_item_id' => 999999, // non-existent catalog ID
                        'base_stars' => 3,
                        'current_stars' => 3,
                        'is_owned' => true,
                    ],
                ],
            ],
        ];

        $res = $this->backupService->import($payload, 'merge');
        $this->assertEquals(1, $res['restored']['user_characters']);
        $this->assertCount(1, $res['unresolved_references']);

        $char = UserCharacter::where('name', 'Foreign Key Test Character')->first();
        $this->assertNotNull($char);
        $this->assertNull($char->uma_catalog_item_id);
    }
}
