<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\SyncRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SyncRun>
 */
class SyncRunFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'source' => SyncRun::SOURCE_GAMETORA,
            'trigger' => SyncRun::TRIGGER_DIRECT,
            'status' => SyncRun::STATUS_SUCCESS,
            'started_at' => now()->subSecond(),
            'finished_at' => now(),
        ];
    }
}
