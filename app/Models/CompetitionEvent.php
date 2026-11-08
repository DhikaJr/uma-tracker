<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\CompetitionSyncService;
use App\Support\CompetitionGreenSkillRecommender;
use App\Support\CompetitionStatRecoveryRecommender;
use Database\Seeders\CompetitionEventSeeder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompetitionEvent extends Model
{
    use HasFactory;

    /**
     * The "booted" method of the model.
     * Overlays canonical official Cygames schedule updates from CompetitionEventSeeder::OFFICIAL_EVENTS
     * when records in the persistent database are missing newly announced race parameters.
     */
    protected static function booted(): void
    {
        static::retrieved(function (self $event) {
            $canonical = CompetitionEventSeeder::OFFICIAL_EVENTS[$event->event_key] ?? null;
            if ($canonical) {
                // Overlay newly announced race parameters where persistent DB currently holds NULL
                foreach ($canonical as $attr => $val) {
                    if ($val !== null && $event->getAttribute($attr) === null) {
                        $event->setAttribute($attr, $val);
                    }
                }

                // For loh-2026-11: overlay confirmed start_date and exact period if not yet set
                if ($event->event_key === 'loh-2026-11' && $event->getAttribute('period') === 'late') {
                    $event->setAttribute('period', 'exact');
                    $event->setAttribute('start_date', '2026-11-22');
                    $event->setAttribute('date_label', '22 November 2026');
                    $event->setAttribute('source_url', 'https://umamusume.jp/news/detail?id=3525');
                }

                // Overlay dynamic live sync data if available
                $syncData = CompetitionSyncService::getLiveSyncData();
                $liveEvent = $syncData['events'][$event->event_key] ?? null;
                if (is_array($liveEvent)) {
                    foreach ($liveEvent as $attr => $val) {
                        if ($val !== null) {
                            $event->setAttribute($attr, $val);
                        }
                    }
                }

                $event->syncOriginal();
            }
        });
    }

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
        'event_key',
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
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'is_fully_confirmed',
        'recommended_green_skills',
        'recommended_build_guide',
    ];

    /**
     * Check if race parameters are fully confirmed by Cygames.
     */
    public function getIsFullyConfirmedAttribute(): bool
    {
        return CompetitionGreenSkillRecommender::isFullyConfirmed($this);
    }

    /**
     * Get recommended green skills matching confirmed race conditions.
     *
     * @return array<string, mixed>
     */
    public function getRecommendedGreenSkillsAttribute(): array
    {
        return CompetitionGreenSkillRecommender::getRecommendations($this);
    }

    /**
     * Get recommended build guide (stats and recovery) for competition event.
     *
     * @return array<string, mixed>
     */
    public function getRecommendedBuildGuideAttribute(): array
    {
        return CompetitionStatRecoveryRecommender::getRecommendations($this);
    }

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
