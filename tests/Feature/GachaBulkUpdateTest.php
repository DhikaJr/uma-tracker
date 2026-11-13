<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class GachaBulkUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_moving_pulls_recalculates_both_banners_and_clears_invalid_rate_up(): void
    {
        $origin = GachaBanner::create(['name' => 'Origin', 'start_date' => '2026-01-01', 'featured_items' => ['Gold Ship']]);
        $destination = GachaBanner::create(['name' => 'Destination', 'start_date' => '2026-01-01', 'featured_items' => ['Special Week']]);
        $pulls = [];
        foreach ([$origin, $origin, $destination] as $banner) {
            $pulls[] = GachaPull::create([
                'gacha_banner_id' => $banner->id, 'banner_type' => 'character', 'pull_type' => 'single',
                'item_name' => 'Gold Ship', 'rarity' => 'SSR', 'is_rate_up' => $banner->is($origin), 'pulled_at' => '2026-01-01',
            ]);
        }

        $this->putJson('/api/gacha/pulls/'.$pulls[0]->id, ['gacha_banner_id' => $destination->id])->assertOk();
        $this->assertFalse($pulls[0]->fresh()->is_rate_up);
        $this->assertSame(1, GachaPity::forBanner('character', $origin->id)->current_pity);
        $this->assertSame(2, GachaPity::forBanner('character', $destination->id)->current_pity);

        $this->postJson('/api/gacha/pulls/bulk-update', ['ids' => [$pulls[1]->id], 'gacha_banner_id' => $destination->id])->assertOk();
        $this->assertFalse($pulls[1]->fresh()->is_rate_up);
        $this->assertSame(0, GachaPity::forBanner('character', $origin->id)->current_pity);
        $this->assertSame(3, GachaPity::forBanner('character', $destination->id)->current_pity);
    }

    #[DataProvider('pityMutations')]
    public function test_mutation_rolls_back_when_pity_recalculation_fails(string $method, string $path): void
    {
        $pull = GachaPull::create([
            'banner_type' => 'character', 'pull_type' => 'single', 'item_name' => 'Gold Ship',
            'rarity' => 'SSR', 'pulled_at' => '2026-01-01',
        ]);
        GachaPity::recalculate('character');
        $pity = GachaPity::forBanner('character');
        $original = GachaPity::getEventDispatcher();
        GachaPity::setEventDispatcher(clone $original);
        GachaPity::saving(static function () use ($path): void {
            static $saves = 0;
            if (++$saves === ($path === '/reset-pity' ? 2 : 1)) {
                throw new RuntimeException('Simulated pity recalculation failure');
            }
        });

        try {
            $this->json($method, '/api/gacha'.str_replace('{id}', (string) $pull->id, $path), [
                'ids' => [$pull->id], 'pull_type' => 'ticket', 'banner_type' => 'character',
            ])->assertServerError();
        } finally {
            GachaPity::setEventDispatcher($original);
        }

        $this->assertSame('single', $pull->fresh()->pull_type);
        $this->assertSame($pity->getAttributes(), $pity->fresh()->getAttributes());
    }

    public static function pityMutations(): array
    {
        return [
            ['PUT', '/pulls/{id}'], ['DELETE', '/pulls/{id}'], ['POST', '/pulls/bulk-update'],
            ['POST', '/pulls/bulk-delete'], ['POST', '/reset-pity'],
        ];
    }

    public function test_can_bulk_update_pull_type_across_multiple_rows(): void
    {
        $banner = GachaBanner::create([
            'id' => 8801,
            'name' => 'Standard Pretty Derby Gacha',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.0,
            'start_date' => '2026-01-01',
        ]);

        $pullIds = [];
        for ($i = 1; $i <= 15; $i++) {
            $pull = GachaPull::create([
                'banner_type' => 'character',
                'gacha_banner_id' => $banner->id,
                'pull_type' => 'single',
                'item_name' => "Character #{$i}",
                'rarity' => 'R',
                'pity_count_at_pull' => $i,
                'pulled_at' => now(),
            ]);
            $pullIds[] = $pull->id;
        }

        $this->assertCount(15, $pullIds);

        // Bulk update all 15 pulls to 'custom_ticket'
        $response = $this->postJson('/api/gacha/pulls/bulk-update', [
            'ids' => $pullIds,
            'pull_type' => 'custom_ticket',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('updated_count', 15);

        // Verify all 15 pulls now have custom_ticket in database
        $this->assertEquals(
            15,
            GachaPull::whereIn('id', $pullIds)->where('pull_type', 'custom_ticket')->count()
        );

        // Bulk update to multi_10
        $response2 = $this->postJson('/api/gacha/pulls/bulk-update', [
            'ids' => $pullIds,
            'pull_type' => 'multi_10',
        ]);

        $response2->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('updated_count', 15);

        $this->assertEquals(
            15,
            GachaPull::whereIn('id', $pullIds)->where('pull_type', 'multi_10')->count()
        );
    }

    public function test_bulk_update_rejects_invalid_pull_type(): void
    {
        $pull = GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Gold Ship',
            'rarity' => 'SR',
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        $response = $this->postJson('/api/gacha/pulls/bulk-update', [
            'ids' => [$pull->id],
            'pull_type' => 'super_mega_ultra_pull',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['pull_type']);
    }

    public function test_bulk_update_requires_ids(): void
    {
        $response = $this->postJson('/api/gacha/pulls/bulk-update', [
            'pull_type' => 'custom_ticket',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['ids']);
    }

    public function test_bulk_update_requires_at_least_one_change_field(): void
    {
        $pull = GachaPull::create([
            'banner_type' => 'character',
            'pull_type' => 'single',
            'item_name' => 'Gold Ship',
            'rarity' => 'SR',
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        $response = $this->postJson('/api/gacha/pulls/bulk-update', [
            'ids' => [$pull->id],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Tidak ada atribut perubahan yang dipilih.');
    }

    public function test_bulk_update_to_twinkle_banner_forces_rate_up_to_false(): void
    {
        $standardBanner = GachaBanner::create([
            'id' => 8802,
            'name' => 'Standard Pretty Derby Gacha 2',
            'banner_type' => 'character',
            'category' => 'standard',
            'base_rate' => 3.0,
            'start_date' => '2026-01-01',
        ]);

        $twinkleBanner = GachaBanner::create([
            'id' => 8803,
            'name' => 'The Twinkle Collection Pretty Derby Gacha (2026)',
            'banner_type' => 'character',
            'category' => 'twinkle',
            'base_rate' => 3.0,
            'start_date' => '2026-01-05',
        ]);

        $pull = GachaPull::create([
            'banner_type' => 'character',
            'gacha_banner_id' => $standardBanner->id,
            'pull_type' => 'single',
            'item_name' => 'Symboli Rudolf',
            'rarity' => 'SSR',
            'is_rate_up' => true,
            'pity_count_at_pull' => 1,
            'pulled_at' => now(),
        ]);

        $this->assertTrue($pull->is_rate_up);

        $response = $this->postJson('/api/gacha/pulls/bulk-update', [
            'ids' => [$pull->id],
            'gacha_banner_id' => $twinkleBanner->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertFalse($pull->fresh()->is_rate_up);
        $this->assertEquals($twinkleBanner->id, $pull->fresh()->gacha_banner_id);
    }
}
