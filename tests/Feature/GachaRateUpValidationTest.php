<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaRateUpValidationTest extends TestCase
{
    use RefreshDatabase;

    protected GachaBanner $standardBanner;

    protected GachaBanner $selectPickupBanner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->standardBanner = GachaBanner::create([
            'banner_type' => 'character',
            'category' => 'standard',
            'name' => 'Debut Gacha: Special Week',
            'base_rate' => 3.00,
            'featured_items' => ['SSR [Special Dreamer] Special Week'],
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-15',
            'is_active' => true,
        ]);

        $this->selectPickupBanner = GachaBanner::create([
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'name' => 'Select Pick Up (Sep 2026)',
            'base_rate' => 3.00,
            'featured_items' => [
                'SSR [刀光散らしてClash！] Tap Dance City (Speed)',
                'SSR [心覚えし、京の華] Air Groove (Speed)',
                'SSR [天才的ユートピア] Tokai Teio (Speed)',
                'SSR [Unveiled Dream] Rhein Kraft (Speed)',
                'SSR [スマイル・エバーアフター] Gran Alegria (Power)',
                'SSR [星跨ぐメッセージ] Neo Universe (Power)',
                'SSR [白に至る純真] Daring Tact (Guts)',
                'SSR [白に至る覚悟] Daring Heart (Guts)',
                'SSR [Innovator] Forever Young (Intelligence)',
                'SSR [一杯のノスタルジア] Tazuna Hayakawa (Friend)',
            ],
            'start_date' => '2026-09-18',
            'end_date' => '2026-09-30',
            'is_active' => true,
        ]);
    }

    /**
     * Single pull should reject a non-rate-up card when marked as is_rate_up = true.
     */
    public function test_single_pull_rejects_non_rate_up_item_marked_as_rate_up(): void
    {
        $response = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $this->standardBanner->id,
            'pull_type' => 'single',
            'item_name' => 'SSR [Wild Top] Vodka',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-01-02',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['is_rate_up']);
    }

    /**
     * Single pull should reject any R rarity card marked as rate-up.
     */
    public function test_single_pull_rejects_r_rarity_marked_as_rate_up(): void
    {
        $response = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $this->standardBanner->id,
            'pull_type' => 'single',
            'item_name' => 'R [Tracen Academy] Special Week',
            'rarity' => 'R',
            'is_rate_up' => true,
            'pulled_at' => '2026-01-02',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['is_rate_up'])
            ->assertJsonPath('errors.is_rate_up.0', 'Kartu dengan rarity R tidak dapat dijadikan rate-up.');
    }

    /**
     * Single pull should accept a valid featured item marked as rate-up.
     */
    public function test_single_pull_accepts_valid_featured_item_marked_as_rate_up(): void
    {
        $response = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'character',
            'gacha_banner_id' => $this->standardBanner->id,
            'pull_type' => 'single',
            'item_name' => 'SSR [Special Dreamer] Special Week',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-01-02',
        ]);

        $response->assertStatus(201);
        $this->assertTrue((bool) $response->json('data.is_rate_up'));
    }

    /**
     * Batch pull should reject when any slot contains a non-rate-up card marked as rate-up.
     */
    public function test_batch_pull_rejects_any_slot_with_invalid_rate_up(): void
    {
        $response = $this->postJson('/api/gacha/pulls/batch', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $this->selectPickupBanner->id,
            'pull_type' => 'multi_10',
            'pulled_at' => '2026-09-19',
            'pulls' => [
                [
                    'item_name' => 'SSR [刀光散らしてClash！] Tap Dance City (Speed)',
                    'rarity' => 'SSR',
                    'is_rate_up' => true, // Valid: in candidate list
                ],
                [
                    'item_name' => 'SR [茂るべきは無垢の瞳] Yaeno Muteki (Stamina)',
                    'rarity' => 'SR',
                    'is_rate_up' => true, // Invalid: SR is not in the 10 SSR candidates
                ],
                [
                    'item_name' => 'R [Tracen Academy] Yayoi Akikawa (Friend)',
                    'rarity' => 'R',
                    'is_rate_up' => true, // Invalid: R rarity cannot be rate-up
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['pulls.1.is_rate_up', 'pulls.2.is_rate_up']);
    }

    /**
     * Select Pick Up banner allows trainer to mark any of the 10 candidate SSRs as rate-up,
     * but rejects non-candidate SSRs and non-SSRs.
     */
    public function test_select_pickup_allows_candidate_ssrs_and_rejects_non_candidates(): void
    {
        // 1. Valid: Trainer chooses Rhein Kraft from the 10 candidates
        $validRes = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $this->selectPickupBanner->id,
            'pull_type' => 'single',
            'item_name' => 'SSR [Unveiled Dream] Rhein Kraft (Speed)',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-09-19',
        ]);

        $validRes->assertStatus(201);
        $this->assertTrue((bool) $validRes->json('data.is_rate_up'));

        // 2. Invalid: An SSR not in the 10 candidates (e.g. Kitasan Black on Sep 2026 banner)
        $invalidRes = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $this->selectPickupBanner->id,
            'pull_type' => 'single',
            'item_name' => 'SSR [Bring Down the Lightning] Kitasan Black (Speed)',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-09-19',
        ]);

        $invalidRes->assertStatus(422)
            ->assertJsonValidationErrors(['is_rate_up']);
    }

    /**
     * Updating an existing pull to is_rate_up = true with a non-rate-up card should be rejected.
     */
    public function test_update_pull_rejects_invalid_rate_up(): void
    {
        $pull = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $this->standardBanner->id,
            'pull_type' => 'single',
            'item_name' => 'SSR [Wild Top] Vodka',
            'rarity' => 'SSR',
            'is_rate_up' => false,
            'pity_count_at_pull' => 1,
            'pulled_at' => '2026-01-02',
        ]);

        $response = $this->putJson("/api/gacha/pulls/{$pull->id}", [
            'is_rate_up' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['is_rate_up']);
    }
}
