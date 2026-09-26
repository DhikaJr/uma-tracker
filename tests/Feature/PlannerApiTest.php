<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlannerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_default_planner_config(): void
    {
        $response = $this->getJson('/api/planner/config');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('config.free_carats', 15000)
            ->assertJsonPath('config.character_tickets', 5)
            ->assertJsonPath('config.support_tickets', 5)
            ->assertJsonPath('config.target_banner_type', 'character')
            ->assertJsonPath('config.shop_friendship_enabled', true)
            ->assertJsonPath('config.shop_horseshoe_silver', true)
            ->assertJsonPath('config.shop_horseshoe_gold', true)
            ->assertJsonPath('config.shop_horseshoe_rainbow', false)
            ->assertJsonPath('config.f2p_training_pass', true);
    }

    public function test_can_save_and_retrieve_custom_planner_config(): void
    {
        $payload = [
            'free_carats' => 30000,
            'paid_carats' => 1500,
            'character_tickets' => 12,
            'support_tickets' => 8,
            'target_banner_type' => 'support',
            'target_date' => '2026-10-31',
            'spark_goal_multiplier' => 2.0,
            'include_predictions' => true,
            'shop_friendship_enabled' => true,
            'shop_horseshoe_silver' => true,
            'shop_horseshoe_gold' => true,
            'shop_horseshoe_rainbow' => true,
            'f2p_training_pass' => true,
            'stadium_class' => 5,
            'circle_rank' => 'SS',
            'champions_meeting_target' => 'final_a_1',
        ];

        $saveResponse = $this->postJson('/api/planner/config', $payload);

        $saveResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('config.free_carats', 30000)
            ->assertJsonPath('config.character_tickets', 12)
            ->assertJsonPath('config.support_tickets', 8)
            ->assertJsonPath('config.target_banner_type', 'support')
            ->assertJsonPath('config.shop_horseshoe_rainbow', true)
            ->assertJsonPath('config.circle_rank', 'SS');

        $getResponse = $this->getJson('/api/planner/config');

        $getResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('config.free_carats', 30000)
            ->assertJsonPath('config.character_tickets', 12)
            ->assertJsonPath('config.support_tickets', 8)
            ->assertJsonPath('config.target_banner_type', 'support')
            ->assertJsonPath('config.shop_horseshoe_rainbow', true);
    }

    public function test_validates_planner_config_input(): void
    {
        $invalidPayload = [
            'free_carats' => -500,
            'target_banner_type' => 'invalid_banner',
            'target_date' => 'not-a-date',
            'spark_goal_multiplier' => -1,
        ];

        $response = $this->postJson('/api/planner/config', $invalidPayload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['free_carats', 'target_banner_type', 'target_date', 'spark_goal_multiplier']);
    }
}
