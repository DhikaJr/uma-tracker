<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\UserSupportCard;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserSupportCard>
 */
class UserSupportCardFactory extends Factory
{
    protected $model = UserSupportCard::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $rarity = fake()->randomElement(['SSR', 'SR', 'R']);
        $type = fake()->randomElement(['Speed', 'Stamina', 'Power', 'Guts', 'Wit', 'Friend', 'Group']);
        $char = fake()->firstName();

        return [
            'uma_catalog_item_id' => null,
            'name' => "{$rarity} [".fake()->word()."] {$char} ({$type})",
            'char_name' => $char,
            'rarity' => $rarity,
            'card_type' => $type,
            'limit_break' => fake()->numberBetween(0, 4),
            'is_owned' => true,
            'obtained_at' => fake()->date(),
            'notes' => null,
        ];
    }
}
