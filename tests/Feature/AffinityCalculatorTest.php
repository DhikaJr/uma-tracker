<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CareerRun;
use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Services\UmaAffinityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffinityCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected UmaAffinityService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(UmaAffinityService::class);
    }

    public function test_can_calculate_pedigree_affinity_with_complete_7_slots(): void
    {
        // Target: Tokai Teio (1003)
        // P1: Special Week (1001) with GP1A: Gold Ship (1007), GP1B: Symboli Rudolf (1017)
        // P2: Silence Suzuka (1002) with GP2A: Oguri Cap (1006), GP2B: Grass Wonder (1011)
        $p1Tree = [
            'parent_id' => 1001,
            'gp1_id' => 1007,
            'gp2_id' => 1017,
        ];

        $p2Tree = [
            'parent_id' => 1002,
            'gp1_id' => 1006,
            'gp2_id' => 1011,
        ];

        $result = $this->service->calculatePedigreeAffinity(1003, $p1Tree, $p2Tree);

        $this->assertIsArray($result);
        $this->assertGreaterThan(0, $result['total_score']);
        $this->assertGreaterThan(0, $result['base_score']);
        $this->assertSame(0, $result['g1_bonus_score']);
        $this->assertTrue($result['lineage_valid']);
        $this->assertEmpty($result['warnings']);

        // Check breakdown contains all relations
        $this->assertArrayHasKey('target_p1', $result['breakdown']);
        $this->assertArrayHasKey('target_p2', $result['breakdown']);
        $this->assertArrayHasKey('p1_p2', $result['breakdown']);
        $this->assertArrayHasKey('p1_gp1a', $result['breakdown']);
        $this->assertArrayHasKey('p1_gp1b', $result['breakdown']);
        $this->assertArrayHasKey('p2_gp2a', $result['breakdown']);
        $this->assertArrayHasKey('p2_gp2b', $result['breakdown']);

        // Base Target-P1 (Tokai Teio <-> Special Week) = 25
        $this->assertSame(25, $result['breakdown']['target_p1']['base']);
        // Base Target-P2 (Tokai Teio <-> Silence Suzuka) = 20
        $this->assertSame(20, $result['breakdown']['target_p2']['base']);
        // Base P1-P2 (Special Week <-> Silence Suzuka) = 27
        $this->assertSame(27, $result['breakdown']['p1_p2']['base']);
    }

    public function test_g1_victory_bonus_adds_points(): void
    {
        $p1Tree = [
            'parent_id' => 1001,
            'gp1_id' => 1007,
            'gp2_id' => 1017,
        ];

        $p2Tree = [
            'parent_id' => 1002,
            'gp1_id' => 1006,
            'gp2_id' => 1011,
        ];

        $resultWithoutBonus = $this->service->calculatePedigreeAffinity(1003, $p1Tree, $p2Tree);

        // Add 3 shared Classic Triple Crown G1 wins: Satsuki Sho (1005), Tokyo Yushun (1010), Kikuka Sho (1015)
        $sharedRaces = [1005, 1010, 1015];
        $resultWithBonus = $this->service->calculatePedigreeAffinity(1003, $p1Tree, $p2Tree, $sharedRaces, 3);

        $this->assertSame($resultWithoutBonus['base_score'], $resultWithBonus['base_score']);
        // 5 relations * 3 shared races * 3 points = 45 points
        $this->assertSame(45, $resultWithBonus['g1_bonus_score']);
        $this->assertSame($resultWithoutBonus['total_score'] + 45, $resultWithBonus['total_score']);
    }

    public function test_badge_classification_thresholds(): void
    {
        $lowBadge = $this->service->getBadge(45);
        $this->assertSame('△', $lowBadge['symbol']);
        $this->assertSame('low', $lowBadge['tier']);

        $normalBadgeMin = $this->service->getBadge(51);
        $this->assertSame('○', $normalBadgeMin['symbol']);
        $this->assertSame('normal', $normalBadgeMin['tier']);

        $normalBadgeMax = $this->service->getBadge(150);
        $this->assertSame('○', $normalBadgeMax['symbol']);
        $this->assertSame('normal', $normalBadgeMax['tier']);

        $maxBadge = $this->service->getBadge(151);
        $this->assertSame('◎', $maxBadge['symbol']);
        $this->assertSame('maximum', $maxBadge['tier']);

        $superMaxBadge = $this->service->getBadge(220);
        $this->assertSame('◎', $superMaxBadge['symbol']);
        $this->assertSame('maximum', $superMaxBadge['tier']);
    }

    public function test_lineage_validation_detects_duplicates(): void
    {
        // Target and P1 same character
        $invalidTargetP1 = $this->service->calculatePedigreeAffinity(
            1001,
            ['parent_id' => 1001],
            ['parent_id' => 1002]
        );
        $this->assertFalse($invalidTargetP1['lineage_valid']);
        $this->assertNotEmpty($invalidTargetP1['warnings']);
        $this->assertStringContainsString('Target Trainee dan Parent 1 tidak boleh', $invalidTargetP1['warnings'][0]);
        $this->assertSame(0, $invalidTargetP1['breakdown']['target_p1']['base']);

        // Target and P2 same character
        $invalidTargetP2 = $this->service->calculatePedigreeAffinity(
            1001,
            ['parent_id' => 1002],
            ['parent_id' => 1001]
        );
        $this->assertFalse($invalidTargetP2['lineage_valid']);
        $this->assertNotEmpty($invalidTargetP2['warnings']);
        $this->assertStringContainsString('Target Trainee dan Parent 2 tidak boleh', $invalidTargetP2['warnings'][0]);
        $this->assertSame(0, $invalidTargetP2['breakdown']['target_p2']['base']);

        // P1 and P2 same character
        $invalidP1P2 = $this->service->calculatePedigreeAffinity(
            1003,
            ['parent_id' => 1001],
            ['parent_id' => 1001]
        );
        $this->assertFalse($invalidP1P2['lineage_valid']);
        $this->assertNotEmpty($invalidP1P2['warnings']);
        $this->assertStringContainsString('Parent 1 dan Parent 2 tidak boleh', $invalidP1P2['warnings'][0]);
        $this->assertSame(0, $invalidP1P2['breakdown']['p1_p2']['base']);

        // Grandparent same side duplicates
        $invalidGps = $this->service->calculatePedigreeAffinity(
            1003,
            ['parent_id' => 1001, 'gp1_id' => 1007, 'gp2_id' => 1007],
            ['parent_id' => 1002]
        );
        $this->assertFalse($invalidGps['lineage_valid']);
        $this->assertNotEmpty($invalidGps['warnings']);
    }

    public function test_can_find_best_parent_recommendations_from_user_characters(): void
    {
        // Setup catalog items
        $itemSpe = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
            'rarity' => 3,
            'raw_data' => ['char_id' => 1001, 'name_en' => 'Special Week', 'name_jp' => 'スペシャルウィーク'],
        ]);

        $itemSuzuka = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Silence Suzuka [Silent Turquoise]',
            'rarity' => 3,
            'raw_data' => ['char_id' => 1002, 'name_en' => 'Silence Suzuka', 'name_jp' => 'サイレンススズカ'],
        ]);

        $itemTeio = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Tokai Teio [Top of the World]',
            'rarity' => 3,
            'raw_data' => ['char_id' => 1003, 'name_en' => 'Tokai Teio', 'name_jp' => 'トウカイテイオー'],
        ]);

        $itemGoldShip = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Gold Ship [Red Strife]',
            'rarity' => 2,
            'raw_data' => ['char_id' => 1007, 'name_en' => 'Gold Ship', 'name_jp' => 'ゴールドシップ'],
        ]);

        // Setup user characters (owned)
        UserCharacter::create([
            'uma_catalog_item_id' => $itemSpe->id,
            'name' => $itemSpe->name,
            'is_owned' => true,
            'base_stars' => 3,
            'current_stars' => 3,
        ]);

        UserCharacter::create([
            'uma_catalog_item_id' => $itemSuzuka->id,
            'name' => $itemSuzuka->name,
            'is_owned' => true,
            'base_stars' => 3,
            'current_stars' => 3,
        ]);

        UserCharacter::create([
            'uma_catalog_item_id' => $itemGoldShip->id,
            'name' => $itemGoldShip->name,
            'is_owned' => true,
            'base_stars' => 2,
            'current_stars' => 3,
        ]);

        // Target: Tokai Teio (1003)
        $recommendations = $this->service->findBestParents(1003, 5);

        $this->assertNotEmpty($recommendations['recommendations']);
        $this->assertLessThanOrEqual(5, count($recommendations['recommendations']));

        $topPair = $recommendations['recommendations'][0];
        $this->assertArrayHasKey('parent1', $topPair);
        $this->assertArrayHasKey('parent2', $topPair);
        $this->assertArrayHasKey('total_base_score', $topPair);

        // Ensure Tokai Teio is not recommended as a parent for itself
        $this->assertNotSame(1003, $topPair['parent1']['char_id']);
        $this->assertNotSame(1003, $topPair['parent2']['char_id']);

        // First pair should have highest score (sorted descending)
        if (count($recommendations['recommendations']) > 1) {
            $secondPair = $recommendations['recommendations'][1];
            $this->assertGreaterThanOrEqual($secondPair['total_base_score'], $topPair['total_base_score']);
        }
    }

    public function test_affinity_api_endpoints(): void
    {
        // 1. Calculate Endpoint
        $calculatePayload = [
            'target_id' => 1003,
            'p1_tree' => [
                'parent_id' => 1001,
                'gp1_id' => 1007,
                'gp2_id' => 1017,
            ],
            'p2_tree' => [
                'parent_id' => 1002,
                'gp1_id' => 1006,
                'gp2_id' => 1011,
            ],
            'shared_g1_races' => [1010, 1005],
            'points_per_race' => 3,
        ];

        $calcResponse = $this->postJson('/api/affinity/calculate', $calculatePayload);
        $calcResponse->assertStatus(200)
            ->assertJsonPath('lineage_valid', true)
            ->assertJsonStructure([
                'total_score',
                'base_score',
                'g1_bonus_score',
                'badge',
                'badge_info',
                'breakdown',
                'thresholds',
            ]);

        // 2. G1 Races Endpoint
        $racesResponse = $this->getJson('/api/affinity/races');
        $racesResponse->assertStatus(200)
            ->assertJsonStructure([
                'categories' => [
                    'classic_triple_crown',
                    'tiara_triple_crown',
                    'spring_senior_g1',
                    'autumn_senior_g1',
                    'sprint_mile_g1',
                    'dirt_g1',
                ],
                'all_races',
            ]);

        // 3. Career Runs Endpoint
        CareerRun::create([
            'uma_name' => 'Tokai Teio',
            'scenario' => 'URA Finals',
            'training_type' => 'manual',
            'starting_fans' => 0,
            'ending_fans' => 350000,
            'evaluation_score' => 15000,
            'final_rank' => 'A+',
            'run_date' => now()->toDateString(),
        ]);

        $runsResponse = $this->getJson('/api/affinity/career-runs?uma_name=Tokai');
        $runsResponse->assertStatus(200)
            ->assertJsonStructure(['runs'])
            ->assertJsonFragment(['uma_name' => 'Tokai Teio']);
    }
}
