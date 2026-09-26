<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GachaBanner extends Model
{
    use HasFactory;

    public const DEFAULT_BASE_RATE = 3.00;

    public const BOOSTED_BASE_RATE = 4.50;

    public const DEFAULT_RATE_UP_PER_ITEM = 0.75;

    protected $attributes = [
        'base_rate' => self::DEFAULT_BASE_RATE,
    ];

    protected $fillable = [
        'id',
        'gametora_id',
        'banner_type',
        'category',
        'base_rate',
        'name',
        'featured_items',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'gametora_id' => 'integer',
        'base_rate' => 'float',
        'featured_items' => 'array',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::saving(function (self $banner) {
            if ($banner->base_rate === null || ! is_numeric($banner->base_rate)) {
                throw new \InvalidArgumentException('Nilai base_rate gacha banner wajib diisi berupa angka dan tidak boleh NULL.');
            }

            $rate = (float) $banner->base_rate;
            if ($rate <= 0.0 || $rate > 100.0) {
                throw new \InvalidArgumentException("Nilai base_rate '{$rate}' di luar rentang valid (harus lebih besar dari 0.0 dan maksimal 100.0).");
            }
        });
    }

    /**
     * Gacha pulls made on this specific banner.
     */
    public function pulls(): HasMany
    {
        return $this->hasMany(GachaPull::class, 'gacha_banner_id');
    }

    /**
     * Pity counter specific to this banner.
     */
    public function pity(): HasOne
    {
        return $this->hasOne(GachaPity::class, 'gacha_banner_id');
    }

    /**
     * Current active pity count for this banner.
     */
    public function getCurrentPityAttribute(): int
    {
        return $this->pity ? (int) $this->pity->current_pity : 0;
    }

    /**
     * Scope query by banner type (character or support_card).
     */
    public function scopeByBannerType(Builder $query, string $bannerType): Builder
    {
        return $query->where('banner_type', $bannerType);
    }

    /**
     * Scope query by category.
     */
    public function scopeByCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope query by year.
     */
    public function scopeByYear(Builder $query, int $year): Builder
    {
        return $query->whereYear('start_date', $year);
    }

    /**
     * Scope query for only active banners based on date or flag.
     */
    public function scopeActive(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where(function ($q) use ($today) {
            $q->where('is_active', true)
                ->orWhere(function ($q2) use ($today) {
                    $q2->where('start_date', '<=', $today)
                        ->where(function ($q3) use ($today) {
                            $q3->whereNull('end_date')
                                ->orWhere('end_date', '>=', $today);
                        });
                });
        });
    }

    /**
     * Determine if a given item/card name is a featured rate-up on this banner.
     */
    public function isItemRateUp(?string $itemName): bool
    {
        if (! $itemName || empty($this->featured_items) || ! is_array($this->featured_items)) {
            return false;
        }

        $normalize = function (string $str): string {
            $str = mb_strtolower(trim($str));
            $str = preg_replace('/^(ssr|sr|r)\s+/iu', '', $str);
            $str = preg_replace('/\s*\([^)]+\)\s*$/u', '', $str);
            $str = str_replace(['［', '］'], ['[', ']'], $str);

            return trim($str);
        };

        $target = $normalize($itemName);
        if ($target === '') {
            return false;
        }

        foreach ($this->featured_items as $featured) {
            $feat = $normalize($featured);
            if ($feat === '') {
                continue;
            }

            if ($target === $feat) {
                return true;
            }

            if (mb_strlen($feat) >= 5 && str_contains($target, $feat)) {
                return true;
            }

            if (mb_strlen($target) >= 5 && str_contains($feat, $target)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get rate-up percentage for a single featured item (standard 0.75% in 2026+ JP).
     */
    public function getRateUpPerItem(): float
    {
        return self::DEFAULT_RATE_UP_PER_ITEM;
    }

    /**
     * Total rate-up percentage across all featured pickup items on this banner.
     */
    public function getTotalRateUpRate(): float
    {
        $count = count($this->featured_items ?? []);

        return min((float) $this->base_rate, round($count * $this->getRateUpPerItem(), 4));
    }

    /**
     * Total rate percentage allocated to non-rate-up SSR pool.
     */
    public function getNonRateUpSsrRate(): float
    {
        return max(0.0, round((float) $this->base_rate - $this->getTotalRateUpRate(), 4));
    }

    /**
     * Check if this banner has a boosted SSR base rate (> 3.00%, e.g. 4.50% Anniversary/Premium).
     */
    public function isBoosted(): bool
    {
        return (float) $this->base_rate > self::DEFAULT_BASE_RATE;
    }

    /**
     * Get structured rate distribution breakdown for this banner.
     *
     * @return array{base_rate: float, rate_up_per_item: float, featured_count: int, total_rate_up: float, non_rate_up_ssr_pool: float, is_boosted: bool}
     */
    public function getRateDistribution(): array
    {
        return [
            'base_rate' => (float) $this->base_rate,
            'rate_up_per_item' => $this->getRateUpPerItem(),
            'featured_count' => count($this->featured_items ?? []),
            'total_rate_up' => $this->getTotalRateUpRate(),
            'non_rate_up_ssr_pool' => $this->getNonRateUpSsrRate(),
            'is_boosted' => $this->isBoosted(),
        ];
    }

    /**
     * Determine if this banner is a Select Pick Up category banner.
     */
    public function isSelectPickup(): bool
    {
        return $this->category === 'select_rate_up' || str_contains(mb_strtolower($this->name), 'select pick up');
    }
}
