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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use Tests\TestCase;

class BackupVerificationTest extends TestCase
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
     * Clear all backup-managed tables to ensure a predictable test environment.
     */
    protected function clearAllBackupTables(): void
    {
        UserCharacter::query()->delete();
        UserSupportCard::query()->delete();
        GachaPull::query()->delete();
        GachaPity::query()->delete();
        GachaBanner::query()->delete();
        UmaCatalogItem::query()->delete();
        CareerRun::query()->delete();
        CircleSnapshot::query()->delete();
        AppSetting::query()->delete();
    }

    /**
     * Skenario 1: Round-Trip Semantik 100% (Mode Overwrite).
     * Mempersiapkan dataset representatif lengkap untuk 9 entitas, mengekspor data,
     * membersihkan basis data in-memory, memulihkan dengan mode overwrite, dan
     * melakukan asersi mendalam pada semua kolom, nested JSON, dan foreign key.
     */
    public function test_scenario_1_semantic_round_trip_100_percent_overwrite_mode(): void
    {
        $this->clearAllBackupTables();

        // 1. App Settings (String & JSON configuration)
        AppSetting::setValue('circle_id', '441730573');
        AppSetting::setValue('tracked_viewer_id', '886175385');
        $plannerConfig = [
            'free_carats' => 45000,
            'paid_carats' => 1500,
            'target_banner_type' => 'support',
            'sparks_saved' => 1,
        ];
        AppSetting::setValue('planner_config', json_encode($plannerConfig));

        // 2. Gacha Banners
        $charBanner = GachaBanner::create([
            'id' => 77001,
            'gametora_id' => 201,
            'name' => 'New Year Special Pickup Pretty Derby Gacha',
            'banner_type' => 'character',
            'category' => 'pickup',
            'base_rate' => 3.50,
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-15',
            'featured_items' => ['Special Week (Kimono)', 'Grass Wonder (Healer)'],
            'is_active' => true,
        ]);

        $cardBanner = GachaBanner::create([
            'id' => 77002,
            'gametora_id' => 202,
            'name' => 'SSR Kitasan Black Rerun Support Card Gacha',
            'banner_type' => 'support',
            'category' => 'rerun',
            'base_rate' => 3.00,
            'start_date' => '2026-01-16',
            'end_date' => '2026-01-30',
            'featured_items' => ['SSR [Top of the World] Kitasan Black'],
            'is_active' => false,
        ]);

        // 3. Gacha Pities
        GachaPity::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $charBanner->id,
            'current_pity' => 140,
            'total_sparks' => 2,
            'last_reset_at' => Carbon::parse('2026-01-10 10:00:00'),
        ]);

        GachaPity::create([
            'banner_type' => 'support',
            'gacha_banner_id' => $cardBanner->id,
            'current_pity' => 40,
            'total_sparks' => 0,
            'last_reset_at' => null,
        ]);

        // 4. Gacha Pulls
        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $charBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Special Week (Kimono)',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pity_count_at_pull' => 140,
            'pulled_at' => Carbon::parse('2026-01-10 10:00:00'),
        ]);

        GachaPull::create([
            'banner_type' => 'support',
            'gacha_banner_id' => $cardBanner->id,
            'pull_type' => 'multi',
            'item_name' => 'Nice Nature (Cheerleader)',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pity_count_at_pull' => 40,
            'pulled_at' => Carbon::parse('2026-01-18 15:30:00'),
        ]);

        // 5. Career Runs
        CareerRun::create([
            'uma_name' => 'Special Week',
            'run_date' => '2026-01-05',
            'scenario' => 'URA Finals',
            'training_type' => 'manual',
            'starting_fans' => 1500,
            'ending_fans' => 650000,
            'fans_gained' => 648500,
            'final_rank' => 'UG1',
            'evaluation_score' => 25800,
            'notes' => 'Perfect run with triple gold skills',
        ]);

        CareerRun::create([
            'uma_name' => 'Silence Suzuka',
            'run_date' => '2026-01-08',
            'scenario' => 'Aoharu Cup',
            'training_type' => 'independent',
            'starting_fans' => 3000,
            'ending_fans' => 450000,
            'fans_gained' => 447000,
            'final_rank' => 'SS',
            'evaluation_score' => 21200,
            'notes' => 'Auto run training mode',
        ]);

        // 6. Circle Snapshots
        $snapshotPayload = [
            'contributions' => [
                'circle' => [
                    'id' => '441730573',
                    'name' => 'Spica Club',
                    'memberCount' => 30,
                ],
                'rows' => [
                    [
                        'rank' => 1,
                        'viewerId' => 886175385,
                        'playerName' => 'Special Trainer',
                        'contribution' => 150000000,
                    ],
                ],
            ],
            'trend' => [
                'range' => '7d',
                'current' => [
                    'rank' => 450,
                    'point' => 1850000000,
                ],
            ],
        ];

        CircleSnapshot::create([
            'circle_id' => '441730573',
            'circle_name' => 'Spica Club',
            'rank' => 450,
            'point' => 1850000000,
            'member_count' => 30,
            'active_total' => 1250000000,
            'period' => '2026-01-01',
            'payload' => $snapshotPayload,
            'last_refreshed_at' => Carbon::parse('2026-01-15 04:00:00'),
        ]);

        // 7. Uma Catalog Items (Character & Support Card with nested attributes)
        $charCatalog = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
            'rarity' => '3',
            'gametora_id' => 100101,
            'raw_data' => [
                'id' => 100101,
                'name' => 'Special Week',
                'title' => 'Special Dreamer',
            ],
            'aptitudes' => [
                'track' => ['turf' => 'A', 'dirt' => 'G'],
                'distance' => ['short' => 'F', 'mile' => 'A', 'medium' => 'A', 'long' => 'A'],
            ],
            'skills' => [
                'innate' => [
                    ['id' => 101, 'name' => 'Shooting Star', 'rarity' => 'Unique'],
                ],
            ],
            'objectives' => [
                ['order' => 1, 'turn' => 11, 'title' => 'Junior Debut', 'target' => 'Race Completion'],
                ['order' => 2, 'turn' => 31, 'title' => 'Japan Derby', 'target' => 'Top 5'],
            ],
            'details' => [
                'growth_rates' => ['speed' => 0, 'stamina' => 20, 'guts' => 10],
            ],
        ]);

        $cardCatalog = UmaCatalogItem::create([
            'type' => 'support_card',
            'name' => 'SSR [Top of the World] Kitasan Black (Speed)',
            'rarity' => 'SSR',
            'gametora_id' => 30028,
            'raw_data' => [
                'support_id' => 30028,
                'char_name' => 'Kitasan Black',
                'type' => 'Speed',
            ],
            'aptitudes' => null,
            'skills' => null,
            'details' => [
                'effects_table_matrix' => [
                    '0' => [30 => 10, 50 => 35],
                ],
                'training_events' => [
                    [
                        'title_en' => 'Go For It!',
                        'choices' => [
                            [
                                'reward_groups' => [
                                    [['type' => 'speed', 'val' => 20]],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        // 8. User Characters
        UserCharacter::create([
            'uma_catalog_item_id' => $charCatalog->id,
            'name' => 'Special Week [Special Dreamer]',
            'base_stars' => 3,
            'current_stars' => 5,
            'is_owned' => true,
            'obtained_at' => '2026-01-02',
            'notes' => 'My first 5 star character',
        ]);

        // 9. User Support Cards
        UserSupportCard::create([
            'uma_catalog_item_id' => $cardCatalog->id,
            'name' => 'SSR [Top of the World] Kitasan Black (Speed)',
            'char_name' => 'Kitasan Black',
            'rarity' => 'SSR',
            'card_type' => 'Speed',
            'limit_break' => 4,
            'is_owned' => true,
            'obtained_at' => '2026-01-16',
            'notes' => 'Core speed card max limit break',
        ]);

        // Step 1: Export
        $exportPayload = $this->backupService->export();
        $this->assertEquals(BackupService::CURRENT_SCHEMA_VERSION, $exportPayload['version']);
        $this->assertEquals(3, $exportPayload['summary']['app_settings']);
        $this->assertEquals(2, $exportPayload['summary']['gacha_banners']);
        $this->assertEquals(2, $exportPayload['summary']['gacha_pities']);
        $this->assertEquals(2, $exportPayload['summary']['gacha_pulls']);
        $this->assertEquals(2, $exportPayload['summary']['career_runs']);
        $this->assertEquals(1, $exportPayload['summary']['circle_snapshots']);
        $this->assertEquals(2, $exportPayload['summary']['uma_catalog_items']);
        $this->assertEquals(1, $exportPayload['summary']['user_characters']);
        $this->assertEquals(1, $exportPayload['summary']['user_support_cards']);

        // Step 2: Wipe all database tables
        $this->clearAllBackupTables();
        $this->assertEquals(0, AppSetting::count());
        $this->assertEquals(0, GachaBanner::count());
        $this->assertEquals(0, GachaPity::count());
        $this->assertEquals(0, GachaPull::count());
        $this->assertEquals(0, CareerRun::count());
        $this->assertEquals(0, CircleSnapshot::count());
        $this->assertEquals(0, UmaCatalogItem::count());
        $this->assertEquals(0, UserCharacter::count());
        $this->assertEquals(0, UserSupportCard::count());

        // Step 3: Restore with Mode Overwrite
        $restoreResult = $this->backupService->import($exportPayload, 'overwrite');
        $this->assertEquals('overwrite', $restoreResult['mode']);
        $this->assertEmpty($restoreResult['unresolved_references']);

        // Step 4: Rigorous semantic validation across all 9 entities
        // 1. App Settings
        $this->assertEquals('441730573', AppSetting::getValue('circle_id'));
        $this->assertEquals('886175385', AppSetting::getValue('tracked_viewer_id'));
        $restoredPlannerConfig = json_decode((string) AppSetting::getValue('planner_config'), true);
        $this->assertEquals(45000, $restoredPlannerConfig['free_carats']);
        $this->assertEquals(1500, $restoredPlannerConfig['paid_carats']);
        $this->assertEquals('support', $restoredPlannerConfig['target_banner_type']);

        // 2. Gacha Banners
        $restoredCharBanner = GachaBanner::find(77001);
        $this->assertNotNull($restoredCharBanner);
        $this->assertEquals('New Year Special Pickup Pretty Derby Gacha', $restoredCharBanner->name);
        $this->assertEquals(201, $restoredCharBanner->gametora_id);
        $this->assertEquals(3.50, $restoredCharBanner->base_rate);
        $this->assertEquals(['Special Week (Kimono)', 'Grass Wonder (Healer)'], $restoredCharBanner->featured_items);
        $this->assertTrue($restoredCharBanner->is_active);

        $restoredCardBanner = GachaBanner::find(77002);
        $this->assertNotNull($restoredCardBanner);
        $this->assertEquals(3.00, $restoredCardBanner->base_rate);
        $this->assertFalse($restoredCardBanner->is_active);

        // 3. Gacha Pities
        $restoredCharPity = GachaPity::where('gacha_banner_id', 77001)->first();
        $this->assertNotNull($restoredCharPity);
        $this->assertEquals(140, $restoredCharPity->current_pity);
        $this->assertEquals(2, $restoredCharPity->total_sparks);
        $this->assertEquals('2026-01-10 10:00:00', $restoredCharPity->last_reset_at?->format('Y-m-d H:i:s'));

        // 4. Gacha Pulls
        $restoredPull1 = GachaPull::where('item_name', 'Special Week (Kimono)')->first();
        $this->assertNotNull($restoredPull1);
        $this->assertEquals('character', $restoredPull1->banner_type);
        $this->assertEquals(77001, $restoredPull1->gacha_banner_id);
        $this->assertEquals('SSR', $restoredPull1->rarity);
        $this->assertTrue($restoredPull1->is_rate_up);
        $this->assertEquals(140, $restoredPull1->pity_count_at_pull);

        // 5. Career Runs
        $restoredRun1 = CareerRun::where('uma_name', 'Special Week')->first();
        $this->assertNotNull($restoredRun1);
        $this->assertEquals('2026-01-05', $restoredRun1->run_date->format('Y-m-d'));
        $this->assertEquals('URA Finals', $restoredRun1->scenario);
        $this->assertEquals('manual', $restoredRun1->training_type);
        $this->assertEquals(648500, $restoredRun1->fans_gained);
        $this->assertEquals('UG1', $restoredRun1->final_rank);
        $this->assertEquals(25800, $restoredRun1->evaluation_score);

        // 6. Circle Snapshots
        $restoredSnapshot = CircleSnapshot::where('circle_id', '441730573')->first();
        $this->assertNotNull($restoredSnapshot);
        $this->assertEquals('Spica Club', $restoredSnapshot->circle_name);
        $this->assertEquals(450, $restoredSnapshot->rank);
        $this->assertEquals(1850000000, $restoredSnapshot->point);
        $this->assertEquals('Special Trainer', $restoredSnapshot->payload['contributions']['rows'][0]['playerName']);
        $this->assertEquals(150000000, $restoredSnapshot->payload['contributions']['rows'][0]['contribution']);

        // 7. Uma Catalog Items
        $restoredCharItem = UmaCatalogItem::where('name', 'Special Week [Special Dreamer]')->first();
        $this->assertNotNull($restoredCharItem);
        $this->assertEquals(100101, $restoredCharItem->gametora_id);
        $this->assertEquals('A', $restoredCharItem->aptitudes['track']['turf']);
        $this->assertEquals('Shooting Star', $restoredCharItem->skills['innate'][0]['name']);
        $this->assertEquals(20, $restoredCharItem->details['growth_rates']['stamina']);
        $this->assertIsArray($restoredCharItem->objectives);
        $this->assertCount(2, $restoredCharItem->objectives);
        $this->assertEquals('Junior Debut', $restoredCharItem->objectives[0]['title']);
        $this->assertEquals('Japan Derby', $restoredCharItem->objectives[1]['title']);

        $restoredCardItem = UmaCatalogItem::where('name', 'SSR [Top of the World] Kitasan Black (Speed)')->first();
        $this->assertNotNull($restoredCardItem);
        $this->assertEquals(30028, $restoredCardItem->gametora_id);
        $this->assertEquals(35, $restoredCardItem->details['effects_table_matrix']['0'][50]);

        // 8. User Characters (foreign key and attributes)
        $restoredUserChar = UserCharacter::where('name', 'Special Week [Special Dreamer]')->first();
        $this->assertNotNull($restoredUserChar);
        $this->assertEquals($restoredCharItem->id, $restoredUserChar->uma_catalog_item_id);
        $this->assertEquals(3, $restoredUserChar->base_stars);
        $this->assertEquals(5, $restoredUserChar->current_stars);
        $this->assertTrue($restoredUserChar->is_owned);

        // 9. User Support Cards (foreign key and attributes)
        $restoredUserCard = UserSupportCard::where('name', 'SSR [Top of the World] Kitasan Black (Speed)')->first();
        $this->assertNotNull($restoredUserCard);
        $this->assertEquals($restoredCardItem->id, $restoredUserCard->uma_catalog_item_id);
        $this->assertEquals(4, $restoredUserCard->limit_break);
        $this->assertEquals('Speed', $restoredUserCard->card_type);
        $this->assertEquals('SSR', $restoredUserCard->rarity);
    }

    /**
     * Skenario 2: Idempotensi & Integritas Merge (Mode Merge).
     * Menguji bahwa merge menggabungkan data awal dengan record baru secara presisi
     * tanpa duplikasi atau inflasi data, serta pemanggilan berulang menghasilkan
     * jumlah record yang identik (idempotent).
     */
    public function test_scenario_2_idempotency_and_merge_integrity(): void
    {
        $this->clearAllBackupTables();

        // 1. Initial State: Record A
        AppSetting::setValue('ui_theme', 'dark');

        $bannerA = GachaBanner::create([
            'id' => 80001,
            'name' => 'Banner Alpha',
            'banner_type' => 'character',
            'category' => 'pickup',
            'base_rate' => 3.0,
            'start_date' => '2026-01-01',
            'is_active' => true,
        ]);

        CareerRun::create([
            'uma_name' => 'Oguri Cap',
            'run_date' => '2026-01-10',
            'scenario' => 'URA Finals',
            'fans_gained' => 400000,
            'final_rank' => 'A',
            'evaluation_score' => 15000,
        ]);

        GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $bannerA->id,
            'pull_type' => 'single',
            'item_name' => 'Oguri Cap',
            'rarity' => 'SSR',
            'pity_count_at_pull' => 10,
            'pulled_at' => Carbon::parse('2026-01-10 12:00:00'),
        ]);

        UserCharacter::create([
            'name' => 'Oguri Cap [Star]',
            'base_stars' => 3,
            'current_stars' => 3,
            'is_owned' => true,
        ]);

        $this->assertEquals(1, AppSetting::count());
        $this->assertEquals(1, GachaBanner::count());
        $this->assertEquals(1, CareerRun::count());
        $this->assertEquals(1, GachaPull::count());
        $this->assertEquals(1, UserCharacter::count());

        // 2. Prepare Merge Payload: Record A (updated/same) + Record B (New)
        $mergePayload = [
            'version' => '2.0',
            'app' => 'Uma Musume Companion',
            'data' => [
                'app_settings' => [
                    ['key' => 'ui_theme', 'value' => 'dark'], // Existing Record A
                    ['key' => 'notifications_enabled', 'value' => 'true'], // New Record B
                ],
                'gacha_banners' => [
                    [
                        'id' => 80001,
                        'name' => 'Banner Alpha',
                        'banner_type' => 'character',
                        'base_rate' => 3.0,
                        'start_date' => '2026-01-01',
                    ], // Existing Record A
                    [
                        'id' => 80002,
                        'name' => 'Banner Beta',
                        'banner_type' => 'support',
                        'base_rate' => 3.0,
                        'start_date' => '2026-02-01',
                    ], // New Record B
                ],
                'career_runs' => [
                    [
                        'uma_name' => 'Oguri Cap',
                        'run_date' => '2026-01-10',
                        'scenario' => 'URA Finals',
                        'fans_gained' => 400000,
                        'final_rank' => 'A',
                        'evaluation_score' => 15000,
                    ], // Existing Record A
                    [
                        'uma_name' => 'Tamamo Cross',
                        'run_date' => '2026-01-12',
                        'scenario' => 'Aoharu Cup',
                        'fans_gained' => 420000,
                        'final_rank' => 'S',
                        'evaluation_score' => 17500,
                    ], // New Record B
                ],
                'gacha_pulls' => [
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 80001,
                        'pull_type' => 'single',
                        'item_name' => 'Oguri Cap',
                        'rarity' => 'SSR',
                        'pity_count_at_pull' => 10,
                        'pulled_at' => '2026-01-10 12:00:00',
                    ], // Existing Record A
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 80001,
                        'pull_type' => 'single',
                        'item_name' => 'Gold Ship',
                        'rarity' => 'SR',
                        'pity_count_at_pull' => 11,
                        'pulled_at' => '2026-01-10 12:05:00',
                    ], // New Record B
                ],
                'user_characters' => [
                    [
                        'name' => 'Oguri Cap [Star]',
                        'base_stars' => 3,
                        'current_stars' => 4, // Updated attribute
                        'is_owned' => true,
                    ], // Existing Record A
                    [
                        'name' => 'Tamamo Cross [White Lightning]',
                        'base_stars' => 3,
                        'current_stars' => 3,
                        'is_owned' => true,
                    ], // New Record B
                ],
            ],
        ];

        // 3. First Merge Execution
        $this->backupService->import($mergePayload, 'merge');

        $this->assertEquals(2, AppSetting::count(), 'AppSettings harus berjumlah 2 setelah merge');
        $this->assertEquals(2, GachaBanner::count(), 'GachaBanners harus berjumlah 2 setelah merge');
        $this->assertEquals(2, CareerRun::count(), 'CareerRuns harus berjumlah 2 setelah merge');
        $this->assertEquals(2, GachaPull::count(), 'GachaPulls harus berjumlah 2 setelah merge');
        $this->assertEquals(2, UserCharacter::count(), 'UserCharacters harus berjumlah 2 setelah merge');

        // Verify updated attribute on existing record
        $this->assertEquals(4, UserCharacter::where('name', 'Oguri Cap [Star]')->first()->current_stars);

        // 4. Second Merge Execution (Idempotency Verification)
        $this->backupService->import($mergePayload, 'merge');

        $this->assertEquals(2, AppSetting::count(), 'AppSettings tidak boleh mengalami inflasi duplikasi');
        $this->assertEquals(2, GachaBanner::count(), 'GachaBanners tidak boleh mengalami inflasi duplikasi');
        $this->assertEquals(2, CareerRun::count(), 'CareerRuns tidak boleh mengalami inflasi duplikasi');
        $this->assertEquals(2, GachaPull::count(), 'GachaPulls tidak boleh mengalami inflasi duplikasi');
        $this->assertEquals(2, UserCharacter::count(), 'UserCharacters tidak boleh mengalami inflasi duplikasi');
    }

    /**
     * Skenario 3: Integritas Relasi & Anti-Cross-Linking.
     * Menguji foreign key resolution cerdas, pencegahan cross-linking ketika ada mismatch
     * nama dengan ID katalog, serta penanganan banner ID yang tidak ditemukan tanpa melempar crash.
     */
    public function test_scenario_3_relationship_integrity_and_anti_cross_linking(): void
    {
        $this->clearAllBackupTables();

        // 1. Seed Reference Catalog Items
        $catalogSpecialWeek = UmaCatalogItem::create([
            'id' => 901,
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
            'gametora_id' => 100101,
        ]);

        $catalogSilenceSuzuka = UmaCatalogItem::create([
            'id' => 902,
            'type' => 'character',
            'name' => 'Silence Suzuka [Silent Star]',
            'gametora_id' => 100201,
        ]);

        $catalogSuperCreek = UmaCatalogItem::create([
            'id' => 903,
            'type' => 'support_card',
            'name' => 'SSR [Warm Sunlight] Super Creek (Stamina)',
            'gametora_id' => 30010,
        ]);

        // 2. Prepare payload with intentional mismatches and dangling references
        $payload = [
            'version' => '2.0',
            'app' => 'Uma Musume Companion',
            'data' => [
                'user_characters' => [
                    // Case A: Stable resolution via exact name and gametora_id
                    [
                        'name' => 'Silence Suzuka [Silent Star]',
                        'gametora_id' => 100201,
                        'uma_catalog_item_id' => null,
                        'base_stars' => 3,
                    ],
                    // Case B: Anti-Cross-Linking Mismatch:
                    // Record name is "Tokai Teio" but provided catalog ID points to Special Week (901)
                    [
                        'name' => 'Tokai Teio [Top of the World]',
                        'uma_catalog_item_id' => 901,
                        'base_stars' => 3,
                    ],
                ],
                'user_support_cards' => [
                    // Case C: Resolution by exact name match
                    [
                        'name' => 'SSR [Warm Sunlight] Super Creek (Stamina)',
                        'char_name' => 'Super Creek',
                        'rarity' => 'SSR',
                        'card_type' => 'Stamina',
                        'limit_break' => 0,
                    ],
                ],
                'gacha_pities' => [
                    // Case D: Dangling Gacha Banner ID (999999 does not exist)
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 999999,
                        'current_pity' => 50,
                        'total_sparks' => 0,
                    ],
                ],
                'gacha_pulls' => [
                    // Case E: Dangling Gacha Banner ID in Pull (888888 does not exist)
                    [
                        'banner_type' => 'character',
                        'gacha_banner_id' => 888888,
                        'pull_type' => 'single',
                        'item_name' => 'Vodka',
                        'rarity' => 'SR',
                        'pity_count_at_pull' => 1,
                        'pulled_at' => '2026-01-20 10:00:00',
                    ],
                ],
            ],
        ];

        $result = $this->backupService->import($payload, 'merge');

        // Verifikasi Case A: Silence Suzuka terhubung ke katalog yang benar
        $suzuka = UserCharacter::where('name', 'Silence Suzuka [Silent Star]')->first();
        $this->assertNotNull($suzuka);
        $this->assertEquals($catalogSilenceSuzuka->id, $suzuka->uma_catalog_item_id);

        // Verifikasi Case B: Tokai Teio TIDAK di-cross-link ke Special Week!
        $teio = UserCharacter::where('name', 'Tokai Teio [Top of the World]')->first();
        $this->assertNotNull($teio);
        $this->assertNull($teio->uma_catalog_item_id, 'Anti-cross-linking harus menyetel ID null ketika terjadi mismatch.');

        // Verifikasi Case C: Super Creek tersambung melalui nama
        $creek = UserSupportCard::where('name', 'SSR [Warm Sunlight] Super Creek (Stamina)')->first();
        $this->assertNotNull($creek);
        $this->assertEquals($catalogSuperCreek->id, $creek->uma_catalog_item_id);

        // Verifikasi Case D & E: Dangling banner ID diset null dengan aman tanpa melanggar FK
        $pity = GachaPity::first();
        $this->assertNotNull($pity);
        $this->assertNull($pity->gacha_banner_id);

        $pull = GachaPull::where('item_name', 'Vodka')->first();
        $this->assertNotNull($pull);
        $this->assertNull($pull->gacha_banner_id);

        // Verifikasi catatan unresolved references
        $this->assertNotEmpty($result['unresolved_references']);
        $entitiesWithUnresolved = array_column($result['unresolved_references'], 'entity');
        $this->assertContains('user_characters', $entitiesWithUnresolved);
        $this->assertContains('gacha_pities', $entitiesWithUnresolved);
        $this->assertContains('gacha_pulls', $entitiesWithUnresolved);
    }

    /**
     * Skenario 4: Uji Real Transaction Rollback (Simulasi Kegagalan Sistem).
     * Menguji atomic rollback nyata tanpa mock subclass dengan memasang event listener
     * pada model CareerRun::saving yang melempar RuntimeException saat proses import berlangsung.
     * Membuktikan bahwa seluruh data awal tetap utuh dan mode overwrite tidak menghapus data sebagian.
     */
    public function test_scenario_4_real_transaction_rollback_without_mock(): void
    {
        $this->clearAllBackupTables();

        // 1. Seed initial data prior to restore attempt
        AppSetting::setValue('app_mode', 'production_original');
        GachaBanner::create([
            'id' => 95001,
            'name' => 'Original Indestructible Banner',
            'banner_type' => 'character',
            'base_rate' => 3.0,
            'start_date' => '2026-01-01',
        ]);
        CareerRun::create([
            'uma_name' => 'Original Mejiro McQueen',
            'run_date' => '2026-01-01',
            'scenario' => 'URA Finals',
            'fans_gained' => 300000,
            'final_rank' => 'A',
            'evaluation_score' => 12000,
        ]);

        $this->assertEquals(1, AppSetting::count());
        $this->assertEquals(1, GachaBanner::count());
        $this->assertEquals(1, CareerRun::count());

        // 2. Register real Eloquent event listener to simulate abrupt system/disk crash
        CareerRun::saving(function (CareerRun $run) {
            if ($run->uma_name === 'Corrupted Abort Uma') {
                throw new \RuntimeException('Simulated Disk I/O Crash mid-transaction');
            }
        });

        // 3. Prepare payload for overwrite mode containing the trigger record
        $failingPayload = [
            'version' => '2.0',
            'app' => 'Uma Musume Companion',
            'data' => [
                'app_settings' => [
                    ['key' => 'app_mode', 'value' => 'corrupted_overwritten'],
                ],
                'gacha_banners' => [
                    [
                        'id' => 95002,
                        'name' => 'Overwritten Banner That Should Rollback',
                        'banner_type' => 'support',
                        'base_rate' => 3.0,
                        'start_date' => '2026-02-01',
                    ],
                ],
                'career_runs' => [
                    [
                        'uma_name' => 'First Valid Runner',
                        'run_date' => '2026-02-01',
                        'scenario' => 'URA Finals',
                        'fans_gained' => 100000,
                        'final_rank' => 'B',
                    ],
                    [
                        'uma_name' => 'Corrupted Abort Uma', // Triggers the exception!
                        'run_date' => '2026-02-02',
                        'scenario' => 'URA Finals',
                        'fans_gained' => 100000,
                        'final_rank' => 'B',
                    ],
                ],
            ],
        ];

        // 4. Execute import and assert exception
        $caught = false;
        try {
            $this->backupService->import($failingPayload, 'overwrite');
        } catch (\RuntimeException $e) {
            $caught = true;
            $this->assertStringContainsString('Simulated Disk I/O Crash mid-transaction', $e->getMessage());
        }

        $this->assertTrue($caught, 'RuntimeException wajib tertangkap');

        // 5. Assert 100% Atomic Rollback: Initial data must remain intact and zero partial writes exist
        $this->assertEquals(1, AppSetting::count(), 'AppSetting awal harus tetap 1 karena transaksi rollback');
        $this->assertEquals('production_original', AppSetting::getValue('app_mode'));

        $this->assertEquals(1, GachaBanner::count(), 'GachaBanner awal harus tetap ada');
        $this->assertNotNull(GachaBanner::find(95001));
        $this->assertNull(GachaBanner::find(95002));

        $this->assertEquals(1, CareerRun::count(), 'CareerRun awal harus tetap ada tanpa partial write');
        $this->assertNotNull(CareerRun::where('uma_name', 'Original Mejiro McQueen')->first());
        $this->assertNull(CareerRun::where('uma_name', 'First Valid Runner')->first());
    }

    /**
     * Skenario 5: Paritas Dua Jalur (Artisan CLI & REST API).
     * Menguji alur backup dan restore melalui antarmuka konsol CLI (`uma:backup` dan `uma:restore`)
     * serta antarmuka REST API (`GET /api/backup/export` dan `POST /api/backup/import` baik JSON maupun file upload),
     * memastikan kesetaraan 100% di kedua kanal.
     */
    public function test_scenario_5_dual_channel_parity_artisan_cli_and_rest_api(): void
    {
        $this->clearAllBackupTables();

        // 1. Seed data for testing
        AppSetting::setValue('cli_test_key', 'cli_initial_value');
        $banner = GachaBanner::create([
            'id' => 60001,
            'name' => 'Dual Channel Banner',
            'banner_type' => 'character',
            'base_rate' => 3.0,
            'start_date' => '2026-03-01',
        ]);
        CareerRun::create([
            'uma_name' => 'Winning Ticket',
            'run_date' => '2026-03-01',
            'scenario' => 'URA Finals',
            'fans_gained' => 500000,
            'final_rank' => 'A+',
        ]);

        // JALUR 1: ARTISAN CLI
        $tempCliPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'uma_cli_test_'.uniqid().'.json';

        // CLI Export
        $backupExitCode = Artisan::call('uma:backup', [
            '--path' => $tempCliPath,
            '--pretty' => true,
        ]);
        $this->assertEquals(0, $backupExitCode, 'Command uma:backup harus exit dengan kode 0 (SUCCESS)');
        $this->assertFileExists($tempCliPath);

        $cliJsonContent = File::get($tempCliPath);
        $cliData = json_decode($cliJsonContent, true);
        $this->assertIsArray($cliData);
        $this->assertEquals(BackupService::CURRENT_SCHEMA_VERSION, $cliData['version']);

        // Update state in database
        AppSetting::setValue('cli_test_key', 'modified_before_restore');

        // CLI Restore (Mode Merge)
        $restoreExitCode = Artisan::call('uma:restore', [
            '--path' => $tempCliPath,
            '--mode' => 'merge',
            '--force' => true,
        ]);
        $this->assertEquals(0, $restoreExitCode, 'Command uma:restore harus exit dengan kode 0 (SUCCESS)');
        $this->assertEquals('cli_initial_value', AppSetting::getValue('cli_test_key'));

        if (File::exists($tempCliPath)) {
            File::delete($tempCliPath);
        }

        // JALUR 2: REST API
        // 2a. API Export
        $exportResponse = $this->getJson('/api/backup/export?download=0');
        $exportResponse->assertStatus(200)
            ->assertJsonPath('version', BackupService::CURRENT_SCHEMA_VERSION)
            ->assertJsonPath('summary.career_runs', 1)
            ->assertJsonPath('summary.gacha_banners', 1);

        $exportedPayload = $exportResponse->json();

        // 2b. API Import via Raw JSON
        $newMergeData = $exportedPayload;
        $newMergeData['data']['app_settings'][] = [
            'key' => 'api_json_key',
            'value' => 'api_json_value',
        ];

        $importJsonResponse = $this->postJson('/api/backup/import', [
            'mode' => 'merge',
            'data' => $newMergeData,
        ]);

        $importJsonResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('mode', 'merge');

        $this->assertEquals('api_json_value', AppSetting::getValue('api_json_key'));

        // 2c. API Import via Multipart File Upload
        $filePayload = $exportedPayload;
        $filePayload['data']['app_settings'][] = [
            'key' => 'api_file_key',
            'value' => 'api_file_value',
        ];

        $uploadedFile = UploadedFile::fake()->createWithContent(
            'backup.json',
            json_encode($filePayload, JSON_UNESCAPED_UNICODE)
        );

        $importFileResponse = $this->post('/api/backup/import', [
            'mode' => 'merge',
            'file' => $uploadedFile,
        ]);

        $importFileResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertEquals('api_file_value', AppSetting::getValue('api_file_key'));
    }

    /**
     * Skenario 6: Defensive Input Validation.
     * Menguji ketahanan validator terhadap input berbahaya atau korup:
     * file bukan JSON, versi skema tidak didukung, duplikasi ID/key internal payload,
     * serta nilai numerik di luar batas valid (range boundary).
     */
    public function test_scenario_6_defensive_input_validation(): void
    {
        $this->clearAllBackupTables();

        // 1. Version validation: unsupported versions (e.g. '3.0' or '1.5')
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Versi skema backup '3.0' tidak didukung");
        $this->backupService->validate([
            'version' => '3.0',
            'data' => [],
        ]);
    }

    public function test_scenario_6_version_1_5_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Versi skema backup '1.5' tidak didukung");
        $this->backupService->validate([
            'version' => '1.5',
            'data' => [],
        ]);
    }

    public function test_scenario_6_missing_data_attribute_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Format file backup tidak valid: atribut data tidak ditemukan atau bukan objek/array.');
        $this->backupService->validate([
            'version' => '2.0',
        ]);
    }

    public function test_scenario_6_internal_duplicate_banner_ids_rejected(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'gacha_banners' => [
                    ['id' => 9991, 'name' => 'Banner 1', 'base_rate' => 3.0],
                    ['id' => 9991, 'name' => 'Banner 2', 'base_rate' => 3.0], // Duplicate ID!
                ],
            ],
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Duplikasi ID '9991' terdeteksi pada gacha_banners");
        $this->backupService->validate($payload);
    }

    public function test_scenario_6_internal_duplicate_app_settings_key_rejected(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'app_settings' => [
                    ['key' => 'circle_id', 'value' => '123'],
                    ['key' => 'circle_id', 'value' => '456'], // Duplicate key!
                ],
            ],
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Duplikasi kunci 'circle_id' terdeteksi pada app_settings");
        $this->backupService->validate($payload);
    }

    public function test_scenario_6_out_of_range_limit_break_rejected(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'user_support_cards' => [
                    [
                        'name' => 'SSR Super Creek',
                        'limit_break' => 99, // Out of range! Valid is 0 - 4
                    ],
                ],
            ],
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Nilai limit_break '99' pada user_support_cards[0] di luar rentang valid (0 - 4).");
        $this->backupService->validate($payload);
    }

    public function test_scenario_6_out_of_range_base_rate_rejected(): void
    {
        $payload = [
            'version' => '2.0',
            'data' => [
                'gacha_banners' => [
                    [
                        'name' => 'Overclocked Gacha Banner',
                        'base_rate' => 150.0, // Out of range! Valid is 0.0 - 100.0
                    ],
                ],
            ],
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Nilai base_rate '150' pada gacha_banners[0] di luar rentang valid (0.0 - 100.0).");
        $this->backupService->validate($payload);
    }

    public function test_scenario_6_api_malformed_json_returns_422(): void
    {
        $badFile = UploadedFile::fake()->createWithContent('bad.json', 'NOT A JSON STRING {{{');

        $response = $this->post('/api/backup/import', [
            'mode' => 'merge',
            'file' => $badFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', fn ($msg) => str_contains((string) $msg, 'bukan file JSON yang valid'));
    }
}
