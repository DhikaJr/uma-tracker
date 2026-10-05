<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaTwinkleCollectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_twinkle_banner_model_attributes_and_rate_distribution(): void
    {
        $twinkleBanner = GachaBanner::create([
            'id' => 9999,
            'name' => 'The Twinkle Collection Pretty Derby Gacha (2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'base_rate' => 3.00,
            'featured_items' => [
                'Symboli Rudolf',
                'Matikanefukukitaru',
                'Zenno Rob Roy',
                'Mayano Top Gun',
                'Biwa Hayahide',
                'Win Variation',
                'Grass Wonder',
                'Mr. C.B.',
            ],
            'start_date' => '2026-01-10',
            'is_active' => true,
        ]);

        $this->assertTrue($twinkleBanner->isTwinkle());
        $this->assertEquals(0.0, $twinkleBanner->getRateUpPerItem());
        $this->assertEquals(0.0, $twinkleBanner->getTotalRateUpRate());
        $this->assertEquals(3.00, $twinkleBanner->getNonRateUpSsrRate());

        // Even though Symboli Rudolf is in featured_items, it must not be considered rate up
        $this->assertFalse($twinkleBanner->isItemRateUp('Symboli Rudolf'));
        $this->assertFalse($twinkleBanner->isItemRateUp('Non-Featured Uma'));

        $dist = $twinkleBanner->getRateDistribution();
        $this->assertEquals(0.0, $dist['rate_up_per_item']);
        $this->assertEquals(0.0, $dist['total_rate_up']);
        $this->assertEquals(3.00, $dist['non_rate_up_ssr_pool']);
    }

    public function test_single_pull_on_twinkle_banner_forces_rate_up_to_false(): void
    {
        $twinkleBanner = GachaBanner::create([
            'id' => 9998,
            'name' => 'The Twinkle Collection Pretty Derby Gacha (2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'base_rate' => 3.00,
            'featured_items' => ['Symboli Rudolf', 'Grass Wonder'],
            'start_date' => '2026-01-10',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $twinkleBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Symboli Rudolf',
            'rarity' => 'SSR',
            'is_rate_up' => true, // Sent as true, but must be forced to false
            'pulled_at' => '2026-01-11',
        ]);

        $response->assertCreated();
        $this->assertFalse($response->json('data.is_rate_up'));

        $pull = GachaPull::where('item_name', 'Symboli Rudolf')->first();
        $this->assertNotNull($pull);
        $this->assertFalse($pull->is_rate_up);
    }

    public function test_batch_pull_on_twinkle_banner_forces_rate_up_to_false(): void
    {
        $twinkleBanner = GachaBanner::create([
            'id' => 9997,
            'name' => 'The Twinkle Collection Pretty Derby Gacha (2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'base_rate' => 3.00,
            'featured_items' => ['Grass Wonder'],
            'start_date' => '2026-01-10',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/gacha/pulls/batch', [
            'banner_type' => 'character',
            'gacha_banner_id' => $twinkleBanner->id,
            'pull_type' => 'multi_10',
            'pulled_at' => '2026-01-11',
            'pulls' => [
                [
                    'item_name' => 'Grass Wonder',
                    'rarity' => 'SSR',
                    'is_rate_up' => true, // Attempted rate-up
                ],
                [
                    'item_name' => 'Generic SR Umamusume',
                    'rarity' => 'SR',
                    'is_rate_up' => false,
                ],
            ],
        ]);

        $response->assertCreated();
        $pulls = $response->json('data');
        $this->assertCount(2, $pulls);
        $this->assertFalse($pulls[0]['is_rate_up']);
    }

    public function test_update_pull_on_twinkle_banner_forces_rate_up_to_false(): void
    {
        $twinkleBanner = GachaBanner::create([
            'id' => 9996,
            'name' => 'The Twinkle Collection Pretty Derby Gacha (2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'base_rate' => 3.00,
            'featured_items' => ['Grass Wonder'],
            'start_date' => '2026-01-10',
            'is_active' => true,
        ]);

        $pull = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $twinkleBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Grass Wonder',
            'rarity' => 'SSR',
            'is_rate_up' => false,
            'pulled_at' => '2026-01-11',
            'pity_count_at_pull' => 1,
        ]);

        $response = $this->putJson("/api/gacha/pulls/{$pull->id}", [
            'banner_type' => 'character',
            'gacha_banner_id' => $twinkleBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Grass Wonder',
            'rarity' => 'SSR',
            'is_rate_up' => true, // Trying to update to true
            'pulled_at' => '2026-01-11',
        ]);

        $response->assertOk();
        $this->assertFalse($response->json('data.is_rate_up'));
        $this->assertFalse($pull->fresh()->is_rate_up);
    }

    public function test_single_pull_on_twinkle_banner_supports_b1_and_b2_characters(): void
    {
        $twinkleBanner = GachaBanner::create([
            'id' => 9995,
            'name' => 'The Twinkle Collection Pretty Derby Gacha (2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'base_rate' => 3.00,
            'featured_items' => ['Satono Crown', 'Sweep Tosho', 'Chrono Genesis'],
            'start_date' => '2026-01-10',
            'is_active' => true,
        ]);

        // 2-star / SR pull (Vodka)
        $srRes = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $twinkleBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Vodka [Wild Top Gear]',
            'rarity' => 'SR',
            'is_rate_up' => false,
            'pulled_at' => '2026-01-11',
        ]);
        $srRes->assertCreated();
        $this->assertEquals('SR', $srRes->json('data.rarity'));
        $this->assertFalse($srRes->json('data.is_rate_up'));

        // 1-star / R pull (Agnes Tachyon)
        $rRes = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $twinkleBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Agnes Tachyon [tach-nology]',
            'rarity' => 'R',
            'is_rate_up' => false,
            'pulled_at' => '2026-01-11',
        ]);
        $rRes->assertCreated();
        $this->assertEquals('R', $rRes->json('data.rarity'));
        $this->assertFalse($rRes->json('data.is_rate_up'));
    }

    public function test_metadata_returns_correct_base_character_rarities(): void
    {
        $response = $this->getJson('/api/gacha/metadata');
        $response->assertOk();

        $rarities = $response->json('character_rarities');
        $this->assertIsArray($rarities);
        $this->assertEquals('SR', $rarities['Vodka [Wild Top Gear]'] ?? null);
        $this->assertEquals('R', $rarities['Agnes Tachyon [tach-nology]'] ?? null);

        $characters = $response->json('characters');
        $this->assertIsArray($characters);
        $this->assertNotEmpty($characters);
        // Ensure no character exists without costume variant brackets
        $this->assertTrue(collect($characters)->every(fn ($c) => str_contains($c, '[')));
    }
}
