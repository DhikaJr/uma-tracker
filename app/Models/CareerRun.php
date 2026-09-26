<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CareerRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'uma_name',
        'scenario',
        'training_type',
        'starting_fans',
        'ending_fans',
        'fans_gained',
        'evaluation_score',
        'final_rank',
        'notes',
        'run_date',
    ];

    protected $attributes = [
        'training_type' => 'manual',
    ];

    protected $casts = [
        'starting_fans' => 'integer',
        'ending_fans' => 'integer',
        'fans_gained' => 'integer',
        'evaluation_score' => 'integer',
        'run_date' => 'date:Y-m-d',
    ];

    /**
     * The "booted" method of the model.
     * Use directly supplied fans_gained, or compute if ending/starting provided.
     */
    protected static function booted(): void
    {
        static::saving(function (CareerRun $run) {
            if (! isset($run->fans_gained) && isset($run->ending_fans, $run->starting_fans)) {
                $starting = (int) ($run->starting_fans ?? 0);
                $ending = (int) ($run->ending_fans ?? 0);
                $run->fans_gained = max(0, $ending - $starting);
            }
        });
    }

    /**
     * Scope query by scenario.
     */
    public function scopeByScenario(Builder $query, string $scenario): Builder
    {
        return $query->where('scenario', $scenario);
    }

    /**
     * Scope query by Uma name.
     */
    public function scopeByUma(Builder $query, string $umaName): Builder
    {
        return $query->where('uma_name', 'like', "%{$umaName}%");
    }

    /**
     * Scope query by training type (manual vs independent).
     */
    public function scopeByTrainingType(Builder $query, string $type): Builder
    {
        return $query->where('training_type', $type);
    }

    /**
     * Scope query for current month.
     */
    public function scopeCurrentMonth(Builder $query): Builder
    {
        return $query->whereYear('run_date', now()->year)
            ->whereMonth('run_date', now()->month);
    }
}
