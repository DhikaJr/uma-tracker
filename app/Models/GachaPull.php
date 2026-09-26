<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GachaPull extends Model
{
    use HasFactory;

    protected $fillable = [
        'banner_type',
        'gacha_banner_id',
        'pull_type',
        'item_name',
        'rarity',
        'is_rate_up',
        'pity_count_at_pull',
        'pulled_at',
    ];

    protected $casts = [
        'gacha_banner_id' => 'integer',
        'is_rate_up' => 'boolean',
        'pity_count_at_pull' => 'integer',
        'pulled_at' => 'datetime',
    ];

    /**
     * Specific Gacha Banner associated with this pull.
     */
    public function banner(): BelongsTo
    {
        return $this->belongsTo(GachaBanner::class, 'gacha_banner_id');
    }

    /**
     * Scope query to only SSR pulls.
     */
    public function scopeSsr(Builder $query): Builder
    {
        return $query->where('rarity', 'SSR');
    }

    /**
     * Scope query by banner type.
     */
    public function scopeByBanner(Builder $query, string $bannerType): Builder
    {
        return $query->where('banner_type', $bannerType);
    }

    /**
     * Scope query by rarity.
     */
    public function scopeByRarity(Builder $query, string $rarity): Builder
    {
        return $query->where('rarity', $rarity);
    }

    /**
     * Scope query to only rate-up pulls.
     */
    public function scopeRateUp(Builder $query): Builder
    {
        return $query->where('is_rate_up', true);
    }
}
