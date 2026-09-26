<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaBanner;
use App\Models\GachaPull;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaBulkUpdateTest extends TestCase
{
    use RefreshDatabase;

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
}
