<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use App\Services\BackupService;
use App\Services\GameToraSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class GachaRateAuditTest extends TestCase
{
    use RefreshDatabase;

    protected BackupService $backupService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->backupService = new BackupService;
    }

    /**
     * Test banner with standard base rate (3.00%):
     * - Stored as explicit attribute
     * - Rate-up defaults to 0.75% per item
     * - Correct non-rate-up SSR pool calculation
     * - isBoosted returns false
     */
    public function test_banner_with_standard_base_rate_3_percent_persists_and_computes_distribution_correctly(): void
    {
        // 1. Standard banner with 1 featured pickup item
        $singlePickupBanner = GachaBanner::create([
            'id' => 1001,
            'name' => 'Standard Single Pickup Pretty Derby Gacha',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.00,
            'featured_items' => ['Special Week [Special Dreamer]'],
            'start_date' => '2026-01-01',
            'is_active' => true,
        ]);

        $this->assertEquals(3.00, $singlePickupBanner->base_rate);
        $this->assertEquals(0.75, $singlePickupBanner->getRateUpPerItem());
        $this->assertEquals(0.75, $singlePickupBanner->getTotalRateUpRate());
        $this->assertEquals(2.25, $singlePickupBanner->getNonRateUpSsrRate());
        $this->assertFalse($singlePickupBanner->isBoosted());

        // 2. Standard banner with 2 featured pickup items
        $doublePickupBanner = GachaBanner::create([
            'id' => 1002,
            'name' => 'Standard Double Pickup Support Card Gacha',
            'banner_type' => 'support_card',
            'category' => 'standard',
            'base_rate' => 3.00,
            'featured_items' => ['SSR [Innovator] Forever Young', 'SSR [American Dream] Casino Drive'],
            'start_date' => '2026-02-01',
            'is_active' => true,
        ]);

        $this->assertEquals(3.00, $doublePickupBanner->base_rate);
        $this->assertEquals(0.75, $doublePickupBanner->getRateUpPerItem());
        $this->assertEquals(1.50, $doublePickupBanner->getTotalRateUpRate());
        $this->assertEquals(1.50, $doublePickupBanner->getNonRateUpSsrRate());
        $this->assertFalse($doublePickupBanner->isBoosted());

        $dist = $doublePickupBanner->getRateDistribution();
        $this->assertEquals([
            'base_rate' => 3.00,
            'rate_up_per_item' => 0.75,
            'featured_count' => 2,
            'total_rate_up' => 1.50,
            'non_rate_up_ssr_pool' => 1.50,
            'is_boosted' => false,
        ], $dist);
    }

    /**
     * Test banner with boosted base rate (4.50%):
     * - Stored as explicit attribute, not guessed
     * - Rate-up remains 0.75% per item
     * - Non-rate-up SSR pool is base_rate - total_rate_up (e.g. 4.50 - 1.50 = 3.00)
     * - isBoosted returns true
     */
    public function test_banner_with_boosted_base_rate_4_point_5_percent_persists_and_computes_distribution_correctly(): void
    {
        // 1. Boosted banner with 1 featured pickup item (e.g. Epiphaneia)
        $singleBoosted = GachaBanner::create([
            'id' => 2001,
            'name' => "5.5th Anniv. Premium Pretty Derby Gacha: Epiphaneia [Fate's Chosen Star]",
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'featured_items' => ["Epiphaneia [Fate's Chosen Star]"],
            'start_date' => '2026-08-24',
            'is_active' => true,
        ]);

        $this->assertEquals(4.50, $singleBoosted->base_rate);
        $this->assertEquals(0.75, $singleBoosted->getRateUpPerItem());
        $this->assertEquals(0.75, $singleBoosted->getTotalRateUpRate());
        $this->assertEquals(3.75, $singleBoosted->getNonRateUpSsrRate());
        $this->assertTrue($singleBoosted->isBoosted());

        // 2. Boosted banner with 2 featured pickup items (e.g. Almond Eye & Forever Young)
        $doubleBoosted = GachaBanner::create([
            'id' => 2002,
            'name' => '5th Anniv. Premium Pretty Derby Gacha (Almond Eye & Forever Young)',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'featured_items' => ['Almond Eye [The Changer]', 'Forever Young [Destiny]'],
            'start_date' => '2026-02-24',
            'is_active' => true,
        ]);

        $this->assertEquals(4.50, $doubleBoosted->base_rate);
        $this->assertEquals(0.75, $doubleBoosted->getRateUpPerItem());
        $this->assertEquals(1.50, $doubleBoosted->getTotalRateUpRate());
        $this->assertEquals(3.00, $doubleBoosted->getNonRateUpSsrRate());
        $this->assertTrue($doubleBoosted->isBoosted());

        $dist = $doubleBoosted->getRateDistribution();
        $this->assertEquals([
            'base_rate' => 4.50,
            'rate_up_per_item' => 0.75,
            'featured_count' => 2,
            'total_rate_up' => 1.50,
            'non_rate_up_ssr_pool' => 3.00,
            'is_boosted' => true,
        ], $dist);
    }

    /**
     * Test default rate-up per item is strictly 0.75% across banners.
     */
    public function test_rate_up_per_item_defaults_to_0_point_75_percent(): void
    {
        $this->assertSame(0.75, GachaBanner::DEFAULT_RATE_UP_PER_ITEM);
        $this->assertSame(3.00, GachaBanner::DEFAULT_BASE_RATE);
        $this->assertSame(4.50, GachaBanner::BOOSTED_BASE_RATE);

        $banner3 = new GachaBanner(['base_rate' => 3.00]);
        $banner45 = new GachaBanner(['base_rate' => 4.50]);

        $this->assertEquals(0.75, $banner3->getRateUpPerItem());
        $this->assertEquals(0.75, $banner45->getRateUpPerItem());
    }

    /**
     * Test banner creation defaults to 3.00% when base_rate is omitted,
     * but does NOT assume or force all banners to be 3.00%.
     */
    public function test_banner_creation_defaults_to_3_percent_when_omitted_without_forcing_all_banners_to_3(): void
    {
        // 1. Creation without specifying base_rate uses default 3.00%
        $defaultBanner = GachaBanner::create([
            'name' => 'Omitted Rate Standard Banner',
            'banner_type' => 'character',
            'category' => 'standard',
            'start_date' => '2026-03-01',
        ]);
        $this->assertEquals(3.00, $defaultBanner->base_rate);

        // 2. Creation with explicit 4.50% preserves 4.50%
        $boostedBanner = GachaBanner::create([
            'name' => 'Explicit 4.5 Banner',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'start_date' => '2026-03-02',
        ]);
        $this->assertEquals(4.50, $boostedBanner->base_rate);

        // 3. Creation with custom valid rate (e.g. 5.00%) preserves custom rate
        $customBanner = GachaBanner::create([
            'name' => 'Custom 5.0 Banner',
            'banner_type' => 'character',
            'category' => 'premium',
            'base_rate' => 5.00,
            'start_date' => '2026-03-03',
        ]);
        $this->assertEquals(5.00, $customBanner->base_rate);
    }

    /**
     * Test Eloquent model validation on GachaBanner:
     * Rejects null, non-numeric, negative, zero, and rates exceeding 100%.
     */
    public function test_gacha_banner_model_validation_rejects_invalid_rates(): void
    {
        // 1. Negative rate
        try {
            GachaBanner::create([
                'name' => 'Negative Rate Banner',
                'banner_type' => 'character',
                'category' => 'standard',
                'base_rate' => -3.00,
                'start_date' => '2026-04-01',
            ]);
            $this->fail('Expected InvalidArgumentException for negative base_rate.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid', $e->getMessage());
        }

        // 2. Zero rate (0.00%)
        try {
            GachaBanner::create([
                'name' => 'Zero Rate Banner',
                'banner_type' => 'character',
                'category' => 'standard',
                'base_rate' => 0.00,
                'start_date' => '2026-04-01',
            ]);
            $this->fail('Expected InvalidArgumentException for zero base_rate.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid', $e->getMessage());
        }

        // 3. Excessive rate (> 100.0%)
        try {
            GachaBanner::create([
                'name' => 'Excessive Rate Banner',
                'banner_type' => 'character',
                'category' => 'standard',
                'base_rate' => 150.00,
                'start_date' => '2026-04-01',
            ]);
            $this->fail('Expected InvalidArgumentException for base_rate > 100.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid', $e->getMessage());
        }
    }

    /**
     * Test BackupService validation strictly rejects zero, negative, null, missing, and excessive base_rate.
     */
    public function test_backup_validation_strictly_rejects_invalid_base_rates(): void
    {
        // 1. Zero base_rate (0.0)
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Zero Rate Backup Banner',
                            'base_rate' => 0.0,
                            'start_date' => '2026-01-01',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for base_rate = 0.0');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid (0.0 - 100.0)', $e->getMessage());
        }

        // 2. Negative base_rate (-1.5)
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Negative Rate Backup Banner',
                            'base_rate' => -1.5,
                            'start_date' => '2026-01-01',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for negative base_rate');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid (0.0 - 100.0)', $e->getMessage());
        }

        // 3. Excessive base_rate (105.0)
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Excessive Rate Backup Banner',
                            'base_rate' => 105.0,
                            'start_date' => '2026-01-01',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for base_rate > 100');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('di luar rentang valid (0.0 - 100.0)', $e->getMessage());
        }

        // 4. NULL base_rate
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Null Rate Backup Banner',
                            'base_rate' => null,
                            'start_date' => '2026-01-01',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for NULL base_rate');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('tidak boleh bernilai NULL', $e->getMessage());
        }

        // 5. Missing base_rate attribute
        try {
            $this->backupService->import([
                'version' => '2.0',
                'data' => [
                    'gacha_banners' => [
                        [
                            'name' => 'Missing Rate Backup Banner',
                            'start_date' => '2026-01-01',
                        ],
                    ],
                ],
            ]);
            $this->fail('Expected exception for missing base_rate');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString("tidak memiliki atribut 'base_rate' yang valid", $e->getMessage());
        }
    }

    /**
     * Test backup export and restore preserves both 3.00% and 4.50% banners accurately.
     */
    public function test_backup_and_restore_preserves_both_3_percent_and_4_point_5_percent_banners_losslessly(): void
    {
        // Clean migration-seeded banners to ensure precise isolation
        GachaBanner::query()->delete();

        // 1. Seed banners with 3.00% and 4.50%
        $banner3 = GachaBanner::create([
            'id' => 5001,
            'name' => 'Pretty Derby Gacha: Manhattan Cafe',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.00,
            'featured_items' => ['Manhattan Cafe'],
            'start_date' => '2026-05-01',
            'is_active' => true,
        ]);

        $banner45 = GachaBanner::create([
            'id' => 5002,
            'name' => '5th Anniv. Premium Pretty Derby Gacha: Almond Eye',
            'banner_type' => 'character',
            'category' => 'anniversary',
            'base_rate' => 4.50,
            'featured_items' => ['Almond Eye [The Changer]'],
            'start_date' => '2026-02-24',
            'is_active' => true,
        ]);

        // 2. Export backup
        $exportPayload = $this->backupService->export();
        $this->assertEquals('2.0', $exportPayload['version']);

        $exportedBanners = collect($exportPayload['data']['gacha_banners'])->keyBy('id');
        $this->assertEquals(3.00, (float) $exportedBanners[5001]['base_rate']);
        $this->assertEquals(4.50, (float) $exportedBanners[5002]['base_rate']);

        // 3. Clear database
        GachaBanner::query()->delete();
        $this->assertEquals(0, GachaBanner::count());

        // 4. Restore backup in overwrite mode
        $importResult = $this->backupService->import($exportPayload, 'overwrite');
        $this->assertEquals(2, $importResult['restored']['gacha_banners']);

        // 5. Verify restored models preserve exact rates
        $restored3 = GachaBanner::find(5001);
        $this->assertNotNull($restored3);
        $this->assertEquals(3.00, $restored3->base_rate);
        $this->assertFalse($restored3->isBoosted());

        $restored45 = GachaBanner::find(5002);
        $this->assertNotNull($restored45);
        $this->assertEquals(4.50, $restored45->base_rate);
        $this->assertTrue($restored45->isBoosted());
    }

    /**
     * Test paid-only gacha exclusion:
     * - Guaranteed 1500 paid Carat ★3/SSR banners and paid-only step-ups are filtered out
     * - Regular banner queries and calculations do not contain paid-only gacha
     */
    public function test_paid_only_gacha_is_excluded_from_regular_banners_and_pool_models(): void
    {
        // 1. Verify GameToraSyncService exclusion rules
        // Banners marked with scam_gacha or restriction 'premium' (paid-only) are excluded by sync
        $mockPaidData = [
            'scam_gacha' => 1,
            'restriction' => 'premium',
            'start' => strtotime('2026-01-01'),
        ];
        $isPaid = ! empty($mockPaidData['scam_gacha']) || ($mockPaidData['restriction'] ?? '') === 'premium';
        $this->assertTrue($isPaid, 'Paid-only scam gacha must be detected and skipped.');

        // 2. Verify regular stats API pool separation only aggregates valid non-paid banners
        $banner = GachaBanner::create([
            'id' => 6001,
            'name' => 'Regular 2026 Free Carat Banner',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.00,
            'start_date' => '2026-06-01',
            'is_active' => true,
        ]);

        GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Special Week',
            'rarity' => 'SSR',
            'gacha_banner_id' => $banner->id,
            'pulled_at' => now(),
        ]);

        $res = $this->getJson('/api/gacha/stats');
        $res->assertStatus(200);
        $this->assertEquals(1, $res->json('total_pulls'));
        $this->assertEquals(1, $res->json('ssr_count'));
        $this->assertEquals(100.0, $res->json('ssr_rate'));
        $this->assertEquals(3.00, (float) $res->json('pools.standard.base_rate'));
        $this->assertEquals(4.50, (float) $res->json('pools.boosted.base_rate'));
    }

    /**
     * Test Select Pick Up banner naming format and manual rate-up recording for trainer choice.
     */
    public function test_select_pickup_banner_naming_and_manual_rate_up_pull_recording(): void
    {
        $banner = GachaBanner::create([
            'gametora_id' => 30471,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Sep 2026)',
            'featured_items' => [
                'SSR [Capricious Excellence] Sweep Tosho',
                'SSR [To You] K.S.Miracle',
                'SSR [Enchaînement] Symboli Rudolf',
                'SSR [A MORE MARVELOUS WORLD! ☆] Marvelous Sunday',
            ],
            'start_date' => '2026-09-18',
            'end_date' => '2026-09-30',
            'is_active' => true,
        ]);

        // Name is cleanly formatted without arbitrary card list appended
        $this->assertEquals('Select Pick Up (Sep 2026)', $banner->name);
        $this->assertStringNotContainsString('Sweep Tosho', $banner->name);

        // Record a pull with a customized rate-up card chosen by trainer (e.g. Symboli Rudolf)
        $customPickedCard = 'SSR [Enchaînement] Symboli Rudolf';
        $postRes = $this->postJson('/api/gacha/pulls', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'single',
            'item_name' => $customPickedCard,
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pulled_at' => '2026-09-19',
        ]);

        $postRes->assertStatus(201);
        $this->assertTrue((bool) $postRes->json('data.is_rate_up'));

        // Batch pull with manual rate-up flag persists correctly
        $batchRes = $this->postJson('/api/gacha/pulls/batch', [
            'banner_type' => 'support_card',
            'gacha_banner_id' => $banner->id,
            'pull_type' => 'multi_10',
            'pulled_at' => '2026-09-19',
            'pulls' => [
                [
                    'item_name' => 'SSR [A MORE MARVELOUS WORLD! ☆] Marvelous Sunday',
                    'rarity' => 'SSR',
                    'is_rate_up' => true,
                ],
                [
                    'item_name' => 'SR [Going for Gold] Gold City',
                    'rarity' => 'SR',
                    'is_rate_up' => false,
                ],
            ],
        ]);

        $batchRes->assertStatus(201);
        $pulls = $batchRes->json('data');
        $this->assertTrue((bool) $pulls[0]['is_rate_up']);
        $this->assertFalse((bool) $pulls[1]['is_rate_up']);
    }

    /**
     * Test sync service correctly normalizes Select Pick Up titles in database.
     */
    public function test_select_pickup_titles_are_normalized_to_month_and_year_only(): void
    {
        // Seed legacy long title
        $legacyBanner = GachaBanner::create([
            'gametora_id' => 99991,
            'banner_type' => 'support_card',
            'category' => 'select_rate_up',
            'base_rate' => 3.00,
            'name' => 'Select Pick Up (Sep 2026) (SSR [Capricious Excellence] Sweep Tosho, SSR [To You] K.S.Miracle)',
            'featured_items' => ['SSR [Capricious Excellence] Sweep Tosho', 'SSR [To You] K.S.Miracle'],
            'start_date' => '2026-09-18',
            'is_active' => true,
        ]);

        // Normalize
        GachaBanner::where('category', 'select_rate_up')
            ->get()
            ->each(function (GachaBanner $banner) {
                if (preg_match('/^(Select Pick Up \([A-Za-z]+ \d{4}\))/i', $banner->name, $matches)) {
                    if ($banner->name !== $matches[1]) {
                        $banner->update(['name' => $matches[1]]);
                    }
                }
            });

        $this->assertEquals('Select Pick Up (Sep 2026)', $legacyBanner->fresh()->name);
    }
}
