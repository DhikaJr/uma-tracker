<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompetitionEvent extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'competition_events';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'event_type',
        'event_name',
        'year',
        'month',
        'period',
        'date_label',
        'start_date',
        'venue',
        'surface',
        'distance',
        'distance_category',
        'direction',
        'season',
        'time_of_day',
        'weather',
        'track_condition',
        'special_rule',
        'source_name',
        'source_url',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'distance' => 'integer',
        'start_date' => 'date:Y-m-d',
    ];

    /**
     * Scope a query to order events chronologically according to:
     * 1. Year ASC
     * 2. Month ASC
     * 3. Period (exact < early < mid < late)
     * 4. start_date ASC (nulls last)
     * 5. ID ASC
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeChronological(Builder $query): Builder
    {
        return $query
            ->orderBy('year', 'asc')
            ->orderBy('month', 'asc')
            ->orderByRaw("CASE period WHEN 'exact' THEN 1 WHEN 'early' THEN 2 WHEN 'mid' THEN 3 WHEN 'late' THEN 4 ELSE 5 END")
            ->orderByRaw('CASE WHEN start_date IS NULL THEN 1 ELSE 0 END, start_date ASC')
            ->orderBy('id', 'asc');
    }
}
