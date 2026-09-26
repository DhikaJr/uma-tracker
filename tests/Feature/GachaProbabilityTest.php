<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaProbabilityTest extends TestCase
{
    use RefreshDatabase;

    protected GachaBanner $standardBanner;

    protected GachaBanner $boostedBanner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->standardBanner = GachaBanner::create([
            'banner_type' => 'character',
            'name' => 'Standard Pretty Derby Gacha',
            'category' => 'standard',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_active' => true,
        ]);

        $this->boostedBanner = GachaBanner::create([
            'banner_type' => 'character',
            'name' => '5th Anniversary Special Gacha (Rate 4.5% Boost)',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'start_date' => '2026-02-24',
            'end_date' => '2026-03-20',
            'is_active' => true,
        ]);
    }

    public function test_luck_percentile_endpoint_calculates_correct_tiers(): void
    {
        // 1. Extreme lucky test: 100 pulls, 10 SSRs at 3.0% rate -> Blessed / Ultra Lucky (>= 85%)
        $resLucky = $this->getJson('/api/gacha/luck-percentile?pulls=100&ssr=10&rate=3.0');
        $resLucky->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tier.key', 'blessed')
            ->assertJsonPath('data.tier.name', 'Blessed / Ultra Lucky');
        $this->assertGreaterThanOrEqual(85.0, $resLucky->json('data.percentile'));

        // 2. Extreme unlucky test: 100 pulls, 0 SSRs at 3.0% rate -> Cursed / Extreme Salty (< 15%)
        $resCursed = $this->getJson('/api/gacha/luck-percentile?pulls=100&ssr=0&rate=3.0');
        $resCursed->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tier.key', 'cursed')
            ->assertJsonPath('data.tier.name', 'Cursed / Extreme Salty');
        $this->assertLessThan(15.0, $resCursed->json('data.percentile'));

        // 3. Average test: 100 pulls, 2 SSRs at 3.0% rate -> Average / On-Rate (40% - 59%)
        $resAverage = $this->getJson('/api/gacha/luck-percentile?pulls=100&ssr=2&rate=3.0');
        $resAverage->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tier.key', 'average')
            ->assertJsonPath('data.tier.name', 'Average / On-Rate');
        $this->assertGreaterThanOrEqual(40.0, $resAverage->json('data.percentile'));
        $this->assertLessThan(60.0, $resAverage->json('data.percentile'));

        // 4. Above average test: 100 pulls, 4 SSRs at 3.0% rate -> Above Average / Lucky (60% - 84%)
        $resLucky2 = $this->getJson('/api/gacha/luck-percentile?pulls=100&ssr=4&rate=3.0');
        $resLucky2->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tier.key', 'lucky')
            ->assertJsonPath('data.tier.name', 'Above Average / Lucky');
        $this->assertGreaterThanOrEqual(60.0, $resLucky2->json('data.percentile'));
        $this->assertLessThan(85.0, $resLucky2->json('data.percentile'));
    }

    public function test_luck_percentile_endpoint_validates_input(): void
    {
        // SSR cannot exceed pulls
        $res = $this->getJson('/api/gacha/luck-percentile?pulls=10&ssr=20');
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['ssr']);

        // Pulls must be at least 1
        $res2 = $this->getJson('/api/gacha/luck-percentile?pulls=0');
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['pulls']);
    }

    public function test_gacha_stats_includes_luck_analysis_and_pool_separation(): void
    {
        // Add 50 pulls on standard banner (1 SSR)
        for ($i = 0; $i < 49; $i++) {
            GachaPull::create([
                'banner_type' => 'character',
                'pull_type' => 'single',
                'item_name' => 'Sakura Bakushin O',
                'rarity' => 'R',
                'pity_count_at_pull' => $i + 1,
                'gacha_banner_id' => $this->standardBanner->id,
            ]);
        }
        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Silence Suzuka',
            'rarity' => 'SSR',
            'pity_count_at_pull' => 50,
            'gacha_banner_id' => $this->standardBanner->id,
        ]);

        // Add 20 pulls on boosted banner (2 SSRs)
        for ($i = 0; $i < 18; $i++) {
            GachaPull::create([
                'banner_type' => 'character',
                'pull_type' => 'single',
                'item_name' => 'Matikanetannhauser',
                'rarity' => 'SR',
                'pity_count_at_pull' => $i + 1,
                'gacha_banner_id' => $this->boostedBanner->id,
            ]);
        }
        for ($i = 0; $i < 2; $i++) {
            GachaPull::create([
                'banner_type' => 'character',
                'pull_type' => 'single',
                'item_name' => 'Epiphaneia [Fate\'s Chosen Star]',
                'rarity' => 'SSR',
                'pity_count_at_pull' => 19 + $i,
                'gacha_banner_id' => $this->boostedBanner->id,
            ]);
        }

        $res = $this->getJson('/api/gacha/stats');
        $res->assertStatus(200)
            ->assertJsonPath('total_pulls', 70)
            ->assertJsonPath('ssr_count', 3)
            ->assertJsonPath('pools.standard.total_pulls', 50)
            ->assertJsonPath('pools.standard.ssr_count', 1)
            ->assertJsonPath('pools.boosted.total_pulls', 20)
            ->assertJsonPath('pools.boosted.ssr_count', 2);

        // Check luck_analysis structure
        $this->assertNotNull($res->json('luck_analysis.overall.percentile'));
        $this->assertNotNull($res->json('luck_analysis.overall.tier_label'));
        $this->assertNotNull($res->json('luck_analysis.standard.percentile'));
        $this->assertNotNull($res->json('luck_analysis.boosted.percentile'));
    }
}
