<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\UserCharacter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserCharacter>
 */
class UserCharacterFactory extends Factory
{
    protected $model = UserCharacter::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $baseStars = fake()->randomElement([1, 2, 3]);

        return [
            'uma_catalog_item_id' => null,
            'name' => fake()->unique()->firstName().' ['.fake()->words(2, true).']',
            'base_stars' => $baseStars,
            'current_stars' => $baseStars,
            'is_owned' => true,
            'obtained_at' => fake()->date(),
            'notes' => null,
        ];
    }
}
