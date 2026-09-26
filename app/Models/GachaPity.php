<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GachaPity extends Model
{
    use HasFactory;

    protected $fillable = [
        'banner_type',
        'gacha_banner_id',
        'current_pity',
        'total_sparks',
        'last_reset_at',
    ];

    protected $casts = [
        'current_pity' => 'integer',
        'total_sparks' => 'integer',
        'gacha_banner_id' => 'integer',
        'last_reset_at' => 'datetime',
    ];

    /**
     * The banner associated with this pity counter (if specific).
     */
    public function banner(): BelongsTo
    {
        return $this->belongsTo(GachaBanner::class, 'gacha_banner_id');
    }

    /**
     * Get or initialize pity record for given banner.
     */
    public static function forBanner(string $bannerType, ?int $gachaBannerId = null): self
    {
        if ($gachaBannerId) {
            $banner = GachaBanner::find($gachaBannerId);
            if ($banner && $banner->banner_type) {
                $bannerType = $banner->banner_type;
            }
        }

        return static::firstOrCreate(
            [
                'banner_type' => $bannerType,
                'gacha_banner_id' => $gachaBannerId,
            ],
            [
                'current_pity' => 0,
                'total_sparks' => 0,
            ]
        );
    }

    /**
     * Recalculate pity count and resequence chronological pity numbers for given banner.
     */
    public static function recalculate(string $bannerType, ?int $gachaBannerId = null): int
    {
        $pity = static::forBanner($bannerType, $gachaBannerId);

        $query = GachaPull::where('banner_type', $bannerType);
        if ($gachaBannerId) {
            $query->where('gacha_banner_id', $gachaBannerId);
        } else {
            $query->whereNull('gacha_banner_id');
        }

        // Chronological order: pulled_at ASC, then id ASC
        $pulls = $query->orderBy('pulled_at', 'asc')->orderBy('id', 'asc')->get();

        $activeCount = 0;
        $priorPulls = [];
        $activePulls = [];

        $sparkedQuota = ($pity->total_sparks ?? 0) * 200;

        foreach ($pulls as $index => $pull) {
            $isAfterReset = false;
            if (! $pity->last_reset_at) {
                $isAfterReset = true;
            } elseif ($sparkedQuota > 0 && $index >= $sparkedQuota) {
                $isAfterReset = true;
            } elseif ($pull->created_at && $pull->created_at->gt($pity->last_reset_at)) {
                $isAfterReset = true;
            } elseif ($pull->pulled_at && $pull->pulled_at->gt($pity->last_reset_at)) {
                $isAfterReset = true;
            }

            if ($isAfterReset) {
                $activePulls[] = $pull;
            } else {
                $priorPulls[] = $pull;
            }
        }

        // Re-sequence prior pulls so they retain proper cycle numbering (1..200) instead of #0
        $priorCount = 0;
        foreach ($priorPulls as $pull) {
            $priorCount++;
            $pityNumber = (($priorCount - 1) % 200) + 1;
            if ($pull->pity_count_at_pull !== $pityNumber) {
                $pull->pity_count_at_pull = $pityNumber;
                $pull->saveQuietly();
            }
        }

        // Sequence active pulls
        foreach ($activePulls as $pull) {
            $activeCount++;
            $pityNumber = (($activeCount - 1) % 200) + 1;
            if ($pull->pity_count_at_pull !== $pityNumber) {
                $pull->pity_count_at_pull = $pityNumber;
                $pull->saveQuietly();
            }
        }

        $pity->current_pity = min(200, $activeCount);
        $pity->save();

        return $pity->current_pity;
    }

    /**
     * Synchronize pity for all banners and unassigned pools.
     */
    public static function syncAll(): void
    {
        // Unassigned character
        static::recalculate('character', null);
        // Unassigned support card
        static::recalculate('support_card', null);

        // All banners that have pulls
        $bannerIds = GachaPull::whereNotNull('gacha_banner_id')
            ->distinct()
            ->pluck('gacha_banner_id');

        foreach ($bannerIds as $bid) {
            $banner = GachaBanner::find($bid);
            if ($banner) {
                static::recalculate($banner->banner_type, $banner->id);
            }
        }
    }
}
