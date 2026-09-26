<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BatchGachaPullRequest;
use App\Http\Requests\BulkDeleteRequest;
use App\Http\Requests\BulkUpdateGachaPullRequest;
use App\Http\Requests\StoreGachaPullRequest;
use App\Http\Requests\UpdateGachaPullRequest;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Services\GameToraSyncService;
use App\Support\UmaCatalog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GachaController extends Controller
{
    /**
     * List 2026 JP gacha banners with filters and pull counts.
     */
    public function banners(Request $request): JsonResponse
    {
        $query = GachaBanner::query()->withCount('pulls');

        if ($request->filled('banner_type') && $request->banner_type !== 'all') {
            $query->where('banner_type', $request->banner_type);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        $banners = $query->orderBy('start_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($banners);
    }

    /**
     * List gacha pulls with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = GachaPull::query()->with('banner:id,name,category,banner_type,base_rate,start_date,end_date');

        if ($request->filled('date_from')) {
            $query->whereDate('pulled_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('pulled_at', '<=', $request->date_to);
        }

        if ($request->filled('banner_type') && $request->banner_type !== 'all') {
            $query->where('banner_type', $request->banner_type);
        }

        $bannerId = $request->input('banner_id', $request->input('gacha_banner_id'));
        if (! empty($bannerId) && $bannerId !== 'all') {
            $query->where('gacha_banner_id', $bannerId);
        }

        if ($request->filled('rate_pool') && $request->rate_pool !== 'all') {
            if ($request->rate_pool === 'boosted' || $request->rate_pool === '4.5') {
                $query->whereHas('banner', fn ($q) => $q->where('base_rate', '>', 3.0));
            } elseif ($request->rate_pool === 'standard' || $request->rate_pool === '3.0') {
                $query->where(function ($q) {
                    $q->whereNull('gacha_banner_id')
                        ->orWhereHas('banner', fn ($bq) => $bq->where('base_rate', '<=', 3.0));
                });
            }
        }

        if ($request->filled('rarity') && $request->rarity !== 'all') {
            $query->where('rarity', $request->rarity);
        }

        if ($request->filled('is_rate_up') && $request->is_rate_up !== 'all') {
            $query->where('is_rate_up', filter_var($request->is_rate_up, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->where('item_name', 'like', '%'.$request->search.'%');
        }

        $perPage = (int) $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 15, 20, 25, 50, 100], true) ? $perPage : 10;

        $pulls = $query->orderBy('pulled_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage);

        return response()->json($pulls);
    }

    /**
     * Store a single gacha pull.
     */
    public function store(StoreGachaPullRequest $request): JsonResponse
    {
        $data = $request->validated();
        $bannerType = $data['banner_type'];
        $gachaBannerId = $data['gacha_banner_id'] ?? null;

        $pull = DB::transaction(function () use ($data, $bannerType, $gachaBannerId) {
            $isRateUp = filter_var($data['is_rate_up'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if ($gachaBannerId) {
                $banner = GachaBanner::find($gachaBannerId);
                if ($banner) {
                    $isFeatured = $banner->isItemRateUp($data['item_name']);
                    if (! $isFeatured) {
                        $isRateUp = false;
                    } elseif (! $isRateUp && ! $banner->isSelectPickup()) {
                        $isRateUp = true;
                    }
                }
            }

            $pull = GachaPull::create([
                'banner_type' => $bannerType,
                'gacha_banner_id' => $gachaBannerId,
                'pull_type' => $data['pull_type'],
                'item_name' => $data['item_name'],
                'rarity' => $data['rarity'],
                'is_rate_up' => $isRateUp,
                'pity_count_at_pull' => 0,
                'pulled_at' => $data['pulled_at'] ?? now(),
            ]);

            GachaPity::recalculate($bannerType, $gachaBannerId);

            return $pull->fresh();
        });

        $pull->load('banner:id,name,category,banner_type,base_rate,start_date,end_date');

        return response()->json([
            'message' => 'Gacha pull logged successfully.',
            'data' => $pull,
        ], 201);
    }

    /**
     * Batch store multiple pulls (e.g. 10x multi-pull).
     */
    public function batchStore(BatchGachaPullRequest $request): JsonResponse
    {
        $data = $request->validated();
        $bannerType = $data['banner_type'];
        $pullType = $data['pull_type'] ?? 'multi_10';
        $pulledAt = $data['pulled_at'] ?? now();
        $gachaBannerId = $data['gacha_banner_id'] ?? null;
        $banner = $gachaBannerId ? GachaBanner::find($gachaBannerId) : null;

        $createdPulls = DB::transaction(function () use ($data, $bannerType, $pullType, $pulledAt, $gachaBannerId, $banner) {
            $results = [];

            foreach ($data['pulls'] as $item) {
                $isRateUp = filter_var($item['is_rate_up'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($banner) {
                    $isFeatured = $banner->isItemRateUp($item['item_name']);
                    if (! $isFeatured) {
                        $isRateUp = false;
                    } elseif (! $isRateUp && ! $banner->isSelectPickup()) {
                        $isRateUp = true;
                    }
                }

                $pull = GachaPull::create([
                    'banner_type' => $bannerType,
                    'gacha_banner_id' => $gachaBannerId,
                    'pull_type' => $pullType,
                    'item_name' => $item['item_name'],
                    'rarity' => $item['rarity'],
                    'is_rate_up' => $isRateUp,
                    'pity_count_at_pull' => 0,
                    'pulled_at' => $pulledAt,
                ]);

                $results[] = $pull;
            }

            GachaPity::recalculate($bannerType, $gachaBannerId);

            return array_map(fn ($p) => $p->fresh(), $results);
        });

        return response()->json([
            'message' => count($createdPulls).' pulls logged successfully.',
            'data' => $createdPulls,
        ], 201);
    }

    /**
     * Update an existing gacha pull and automatically recalculate pity.
     */
    public function update(UpdateGachaPullRequest $request, int $id): JsonResponse
    {
        $pull = GachaPull::findOrFail($id);
        $oldBannerType = $pull->banner_type;
        $oldBannerId = $pull->gacha_banner_id;

        $data = $request->validated();

        if (array_key_exists('is_rate_up', $data)) {
            $bannerId = $data['gacha_banner_id'] ?? $pull->gacha_banner_id;
            $itemName = $data['item_name'] ?? $pull->item_name;
            if ($bannerId) {
                $banner = GachaBanner::find($bannerId);
                if ($banner && ! $banner->isItemRateUp($itemName)) {
                    $data['is_rate_up'] = false;
                }
            }
        }

        $pull->update($data);

        // Recalculate pity for the old banner
        $oldPity = GachaPity::recalculate($oldBannerType, $oldBannerId);

        // If banner type or banner ID changed, also recalculate for the new banner
        $newPity = $oldPity;
        if (($pull->banner_type !== $oldBannerType) || ($pull->gacha_banner_id !== $oldBannerId)) {
            $newPity = GachaPity::recalculate($pull->banner_type, $pull->gacha_banner_id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data tarikan gacha berhasil diperbarui.',
            'pull' => $pull->fresh(),
            'data' => $pull->fresh(),
            'active_pity' => $newPity,
        ]);
    }

    /**
     * Delete a gacha pull and automatically recalculate pity for that banner.
     */
    public function destroy(int $id): JsonResponse
    {
        $pull = GachaPull::findOrFail($id);
        $bannerType = $pull->banner_type;
        $gachaBannerId = $pull->gacha_banner_id;

        $pull->delete();

        // Recalculate pity count for this banner immediately so it never desyncs
        $newPity = GachaPity::recalculate($bannerType, $gachaBannerId);

        return response()->json([
            'message' => 'Gacha pull deleted successfully.',
            'active_pity' => $newPity,
            'gacha_banner_id' => $gachaBannerId,
        ]);
    }

    /**
     * Delete multiple gacha pulls in bulk and recalculate pity for affected banners.
     */
    public function bulkDestroy(BulkDeleteRequest $request): JsonResponse
    {
        $ids = $request->validated()['ids'];
        $pulls = GachaPull::whereIn('id', $ids)->get(['id', 'banner_type', 'gacha_banner_id']);

        $affectedPairs = [];
        foreach ($pulls as $pull) {
            $key = $pull->banner_type.'_'.($pull->gacha_banner_id ?? 'null');
            $affectedPairs[$key] = [
                'banner_type' => $pull->banner_type,
                'gacha_banner_id' => $pull->gacha_banner_id,
            ];
        }

        $deleted = GachaPull::whereIn('id', $ids)->delete();

        foreach ($affectedPairs as $pair) {
            GachaPity::recalculate($pair['banner_type'], $pair['gacha_banner_id']);
        }

        return response()->json([
            'success' => true,
            'message' => "{$deleted} data gacha pull berhasil dihapus.",
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * Bulk update multiple gacha pulls (e.g. change pull_type, banner, or date across selected rows).
     */
    public function bulkUpdate(BulkUpdateGachaPullRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $ids = $validated['ids'];

        $updateData = [];
        if (! empty($validated['pull_type'])) {
            $updateData['pull_type'] = $validated['pull_type'];
        }
        if (array_key_exists('gacha_banner_id', $validated) && $validated['gacha_banner_id'] !== null) {
            $updateData['gacha_banner_id'] = $validated['gacha_banner_id'];
            $banner = GachaBanner::find($validated['gacha_banner_id']);
            if ($banner) {
                $updateData['banner_type'] = $banner->banner_type;
            }
        }
        if (! empty($validated['pulled_at'])) {
            $updateData['pulled_at'] = $validated['pulled_at'];
        }

        if (empty($updateData)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada atribut perubahan yang dipilih.',
            ], 422);
        }

        $pulls = GachaPull::whereIn('id', $ids)->get(['id', 'banner_type', 'gacha_banner_id']);
        if ($pulls->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data gacha pull yang cocok dengan ID terpilih.',
            ], 404);
        }

        $affectedPairs = [];
        foreach ($pulls as $pull) {
            $key = $pull->banner_type.'_'.($pull->gacha_banner_id ?? 'null');
            $affectedPairs[$key] = [
                'banner_type' => $pull->banner_type,
                'gacha_banner_id' => $pull->gacha_banner_id,
            ];
        }

        if (isset($updateData['banner_type'])) {
            $newKey = $updateData['banner_type'].'_'.($updateData['gacha_banner_id'] ?? 'null');
            $affectedPairs[$newKey] = [
                'banner_type' => $updateData['banner_type'],
                'gacha_banner_id' => $updateData['gacha_banner_id'] ?? null,
            ];
        }

        $updated = GachaPull::whereIn('id', $ids)->update($updateData);

        foreach ($affectedPairs as $pair) {
            GachaPity::recalculate($pair['banner_type'], $pair['gacha_banner_id']);
        }

        return response()->json([
            'success' => true,
            'message' => "{$updated} data gacha pull berhasil diperbarui secara massal.",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Comprehensive Gacha statistics: total pulls, SSR count, SSR rate %,
     * rate vs 3% baseline, active pity per banner, and per-banner breakdown.
     */
    public function stats(Request $request): JsonResponse
    {
        $bannerType = $request->input('banner_type', 'all');
        $gachaBannerId = $request->input('gacha_banner_id', 'all');
        $ratePool = $request->input('rate_pool', 'all'); // 'all', 'standard', 'boosted'

        $baseQuery = GachaPull::query();
        if ($bannerType !== 'all') {
            $baseQuery->where('banner_type', $bannerType);
        }
        if ($gachaBannerId !== 'all' && is_numeric($gachaBannerId)) {
            $baseQuery->where('gacha_banner_id', (int) $gachaBannerId);
        }

        // Apply rate_pool filter to main active query if requested
        $query = clone $baseQuery;
        if ($ratePool === 'standard' || $ratePool === '3.0') {
            $query->where(function ($q) {
                $q->whereNull('gacha_banner_id')
                    ->orWhereHas('banner', fn ($bq) => $bq->where('base_rate', '<=', 3.0));
            });
        } elseif ($ratePool === 'boosted' || $ratePool === '4.5') {
            $query->whereHas('banner', fn ($bq) => $bq->where('base_rate', '>', 3.0));
        }

        $totalPulls = (clone $query)->count();
        $ssrCount = (clone $query)->where('rarity', 'SSR')->count();
        $srCount = (clone $query)->where('rarity', 'SR')->count();
        $rCount = (clone $query)->where('rarity', 'R')->count();
        $rateUpCount = (clone $query)->where('is_rate_up', true)->count();

        $ssrRate = $totalPulls > 0 ? round(($ssrCount / $totalPulls) * 100, 2) : 0.0;
        $srRate = $totalPulls > 0 ? round(($srCount / $totalPulls) * 100, 2) : 0.0;
        $rRate = $totalPulls > 0 ? round(($rCount / $totalPulls) * 100, 2) : 0.0;

        // Pre-calculate isolated pools for quick switching
        // 1. Standard Pool (<= 3.00% or null banner)
        $stdQuery = (clone $baseQuery)->where(function ($q) {
            $q->whereNull('gacha_banner_id')
                ->orWhereHas('banner', fn ($bq) => $bq->where('base_rate', '<=', 3.0));
        });
        $stdTotal = (clone $stdQuery)->count();
        $stdSsr = (clone $stdQuery)->where('rarity', 'SSR')->count();
        $stdSr = (clone $stdQuery)->where('rarity', 'SR')->count();
        $stdR = (clone $stdQuery)->where('rarity', 'R')->count();
        $stdRate = $stdTotal > 0 ? round(($stdSsr / $stdTotal) * 100, 2) : 0.0;

        // 2. Boosted Pool (> 3.00%, e.g. Epiphaneia 4.5%)
        $bstQuery = (clone $baseQuery)->whereHas('banner', fn ($bq) => $bq->where('base_rate', '>', 3.0));
        $bstTotal = (clone $bstQuery)->count();
        $bstSsr = (clone $bstQuery)->where('rarity', 'SSR')->count();
        $bstSr = (clone $bstQuery)->where('rarity', 'SR')->count();
        $bstR = (clone $bstQuery)->where('rarity', 'R')->count();
        $bstRate = $bstTotal > 0 ? round(($bstSsr / $bstTotal) * 100, 2) : 0.0;

        $allTotal = (clone $baseQuery)->count();
        $allSsr = (clone $baseQuery)->where('rarity', 'SSR')->count();
        $allSr = (clone $baseQuery)->where('rarity', 'SR')->count();
        $allR = (clone $baseQuery)->where('rarity', 'R')->count();
        $allRate = $allTotal > 0 ? round(($allSsr / $allTotal) * 100, 2) : 0.0;

        // Base rate determination
        if ($gachaBannerId !== 'all' && is_numeric($gachaBannerId)) {
            $selectedBanner = GachaBanner::find((int) $gachaBannerId);
            $baseRate = (float) ($selectedBanner->base_rate ?? 3.00);
        } elseif ($ratePool === 'boosted' || $ratePool === '4.5') {
            $baseRate = 4.50;
        } elseif ($ratePool === 'standard' || $ratePool === '3.0') {
            $baseRate = 3.00;
        } elseif ($request->has('base_rate') && (float) $request->input('base_rate') > 0) {
            $baseRate = (float) $request->input('base_rate');
        } else {
            // Auto-detect based on banner composition in current query
            if ($allTotal > 0 && $stdTotal === 0 && $bstTotal > 0) {
                $baseRate = 4.50;
            } elseif ($allTotal > 0 && $bstTotal === 0 && $stdTotal > 0) {
                $baseRate = 3.00;
            } else {
                $baseRate = 3.00;
            }
        }

        $luckDiff = round($ssrRate - $baseRate, 2);

        // Global Category Breakdown (all-time pulls per banner type)
        $charQueryGlobal = GachaPull::where('banner_type', 'character');
        $charTotal = (clone $charQueryGlobal)->count();
        $charSsr = (clone $charQueryGlobal)->where('rarity', 'SSR')->count();
        $charSr = (clone $charQueryGlobal)->where('rarity', 'SR')->count();
        $charR = (clone $charQueryGlobal)->where('rarity', 'R')->count();
        $charRate = $charTotal > 0 ? round(($charSsr / $charTotal) * 100, 2) : 0.0;
        $charBstCount = (clone $charQueryGlobal)->whereHas('banner', fn ($bq) => $bq->where('base_rate', '>', 3.0))->count();
        $charStdCount = $charTotal - $charBstCount;
        $charBaseRate = $charTotal > 0 ? ($charStdCount === 0 && $charBstCount > 0 ? 4.50 : ($charBstCount === 0 ? 3.00 : round((($charStdCount * 0.03 + $charBstCount * 0.045) / $charTotal) * 100, 2))) : 4.50;

        $suppQueryGlobal = GachaPull::where('banner_type', 'support_card');
        $suppTotal = (clone $suppQueryGlobal)->count();
        $suppSsr = (clone $suppQueryGlobal)->where('rarity', 'SSR')->count();
        $suppSr = (clone $suppQueryGlobal)->where('rarity', 'SR')->count();
        $suppR = (clone $suppQueryGlobal)->where('rarity', 'R')->count();
        $suppRate = $suppTotal > 0 ? round(($suppSsr / $suppTotal) * 100, 2) : 0.0;
        $suppBstCount = (clone $suppQueryGlobal)->whereHas('banner', fn ($bq) => $bq->where('base_rate', '>', 3.0))->count();
        $suppStdCount = $suppTotal - $suppBstCount;
        $suppBaseRate = $suppTotal > 0 ? ($suppStdCount === 0 && $suppBstCount > 0 ? 4.50 : ($suppBstCount === 0 ? 3.00 : round((($suppStdCount * 0.03 + $suppBstCount * 0.045) / $suppTotal) * 100, 2))) : 3.00;

        $categories = [
            'character' => [
                'name' => 'Gacha Karakter',
                'type' => 'character',
                'total_pulls' => $charTotal,
                'ssr_count' => $charSsr,
                'sr_count' => $charSr,
                'r_count' => $charR,
                'ssr_rate' => $charRate,
                'base_rate' => $charBaseRate,
                'luck_diff' => round($charRate - $charBaseRate, 2),
                'expected_interval' => $charBaseRate > 3.0 ? 22.2 : 33.3,
            ],
            'support_card' => [
                'name' => 'Gacha Support Card',
                'type' => 'support_card',
                'total_pulls' => $suppTotal,
                'ssr_count' => $suppSsr,
                'sr_count' => $suppSr,
                'r_count' => $suppR,
                'ssr_rate' => $suppRate,
                'base_rate' => $suppBaseRate,
                'luck_diff' => round($suppRate - $suppBaseRate, 2),
                'expected_interval' => $suppBaseRate > 3.0 ? 22.2 : 33.3,
            ],
            'all' => [
                'name' => 'Semua Gacha (Gabungan)',
                'type' => 'all',
                'total_pulls' => $charTotal + $suppTotal,
                'ssr_count' => $charSsr + $suppSsr,
                'sr_count' => $charSr + $suppSr,
                'r_count' => $charR + $suppR,
                'ssr_rate' => ($charTotal + $suppTotal) > 0 ? round((($charSsr + $suppSsr) / ($charTotal + $suppTotal)) * 100, 2) : 0.0,
                'base_rate' => 3.00,
                'luck_diff' => round((($charTotal + $suppTotal) > 0 ? round((($charSsr + $suppSsr) / ($charTotal + $suppTotal)) * 100, 2) : 0.0) - 3.00, 2),
                'expected_interval' => 33.3,
            ],
        ];

        $pools = [
            'all' => [
                'name' => 'Semua Gacha (Gabungan)',
                'base_rate' => $baseRate,
                'total_pulls' => $allTotal,
                'ssr_count' => $allSsr,
                'sr_count' => $allSr,
                'r_count' => $allR,
                'ssr_rate' => $allRate,
                'luck_diff' => round($allRate - $baseRate, 2),
            ],
            'standard' => [
                'name' => 'Standar (3.0%)',
                'base_rate' => 3.00,
                'total_pulls' => $stdTotal,
                'ssr_count' => $stdSsr,
                'sr_count' => $stdSr,
                'r_count' => $stdR,
                'ssr_rate' => $stdRate,
                'luck_diff' => round($stdRate - 3.00, 2),
            ],
            'boosted' => [
                'name' => 'Boosted (4.5% Epiphaneia)',
                'base_rate' => 4.50,
                'total_pulls' => $bstTotal,
                'ssr_count' => $bstSsr,
                'sr_count' => $bstSr,
                'r_count' => $bstR,
                'ssr_rate' => $bstRate,
                'luck_diff' => round($bstRate - 4.50, 2),
            ],
        ];

        // Binomial Luck Analysis (Cumulative Binomial Distribution P(X <= k))
        $stdPercentile = $stdTotal > 0 ? $this->computeBinomialCdf($stdTotal, $stdSsr, 0.03) : 50.0;
        $stdTier = $this->resolveLuckTier($stdPercentile);

        $bstPercentile = $bstTotal > 0 ? $this->computeBinomialCdf($bstTotal, $bstSsr, 0.045) : 50.0;
        $bstTier = $this->resolveLuckTier($bstPercentile);

        $expectedSsr = ($stdTotal * 0.03) + ($bstTotal * 0.045);
        $totalVariance = ($stdTotal * 0.03 * 0.97) + ($bstTotal * 0.045 * 0.955);
        if ($allTotal > 0 && $totalVariance > 0) {
            $zScore = ($allSsr + 0.5 - $expectedSsr) / sqrt($totalVariance);
            $allPercentile = round(min(1.0, max(0.0, 0.5 * (1.0 + $this->erf($zScore / sqrt(2.0))))) * 100.0, 2);
        } else {
            $allPercentile = 50.0;
        }
        $allTier = $this->resolveLuckTier($allPercentile);

        $pools['all']['percentile'] = $allPercentile;
        $pools['all']['tier_label'] = $allTier['label'];
        $pools['all']['tier'] = $allTier['tier'];

        $pools['standard']['percentile'] = $stdPercentile;
        $pools['standard']['tier_label'] = $stdTier['label'];
        $pools['standard']['tier'] = $stdTier['tier'];

        $pools['boosted']['percentile'] = $bstPercentile;
        $pools['boosted']['tier_label'] = $bstTier['label'];
        $pools['boosted']['tier'] = $bstTier['tier'];

        $luckAnalysis = [
            'standard' => [
                'name' => 'Standar (3.0%)',
                'total_pulls' => $stdTotal,
                'ssr_count' => $stdSsr,
                'expected_ssr' => round($stdTotal * 0.03, 1),
                'rate_percent' => $stdRate,
                'base_rate' => 3.0,
                'percentile' => $stdPercentile,
                'tier' => $stdTier['tier'],
                'tier_label' => $stdTier['label'],
                'color' => $stdTier['color'],
            ],
            'boosted' => [
                'name' => 'Boosted (4.5%)',
                'total_pulls' => $bstTotal,
                'ssr_count' => $bstSsr,
                'expected_ssr' => round($bstTotal * 0.045, 1),
                'rate_percent' => $bstRate,
                'base_rate' => 4.5,
                'percentile' => $bstPercentile,
                'tier' => $bstTier['tier'],
                'tier_label' => $bstTier['label'],
                'color' => $bstTier['color'],
            ],
            'overall' => [
                'name' => 'Semua Gacha (Gabungan)',
                'total_pulls' => $allTotal,
                'ssr_count' => $allSsr,
                'expected_ssr' => round($expectedSsr, 1),
                'rate_percent' => $allRate,
                'base_rate' => round($baseRate, 2),
                'percentile' => $allPercentile,
                'tier' => $allTier['tier'],
                'tier_label' => $allTier['label'],
                'color' => $allTier['color'],
            ],
        ];

        // Pity calculation per banner & active pity
        $activeBannerName = null;
        $activeBannerId = null;

        if ($gachaBannerId !== 'all' && is_numeric($gachaBannerId)) {
            $selectedBanner = GachaBanner::find((int) $gachaBannerId);
            $bType = $selectedBanner?->banner_type ?? ($bannerType !== 'all' ? $bannerType : 'character');
            $activePity = GachaPity::forBanner($bType, (int) $gachaBannerId)->current_pity;
            $activeBannerName = $selectedBanner?->name;
            $activeBannerId = (int) $gachaBannerId;
        } else {
            // Find banner with highest active pity matching bannerType
            $bannerQuery = GachaPity::query()
                ->whereNotNull('gacha_banner_id')
                ->where('current_pity', '>', 0);

            if ($bannerType !== 'all') {
                $bannerQuery->where('banner_type', $bannerType);
            }

            $topPityRecord = $bannerQuery->orderByDesc('current_pity')->first();

            if ($topPityRecord) {
                $activePity = $topPityRecord->current_pity;
                $activeBannerName = $topPityRecord->banner?->name;
                $activeBannerId = $topPityRecord->gacha_banner_id;
            } else {
                $bType = $bannerType === 'support_card' ? 'support_card' : 'character';
                $unassignedPity = GachaPity::forBanner($bType, null);
                $activePity = $unassignedPity->current_pity;
                $activeBannerName = null;
                $activeBannerId = null;
            }
        }

        $characterPity = GachaPity::forBanner('character', null)->current_pity;
        $supportPity = GachaPity::forBanner('support_card', null)->current_pity;

        // Breakdown for charts
        $rarityDistribution = [
            ['name' => 'SSR (3★ / SSR)', 'value' => $ssrCount, 'color' => '#f59e0b', 'percentage' => $ssrRate],
            ['name' => 'SR (2★ / SR)', 'value' => $srCount, 'color' => '#94a3b8', 'percentage' => $srRate],
            ['name' => 'R (1★ / R)', 'value' => $rCount, 'color' => '#d97706', 'percentage' => $rRate],
        ];

        // Recent SSR Pulls
        $recentSsr = GachaPull::with('banner:id,name,category,base_rate')
            ->where('rarity', 'SSR')
            ->orderBy('pulled_at', 'desc')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        // Banner breakdown (only banners that have logged pulls)
        $bannerBreakdown = GachaBanner::withCount([
            'pulls',
            'pulls as ssr_count' => function ($q) {
                $q->where('rarity', 'SSR');
            },
            'pulls as sr_count' => function ($q) {
                $q->where('rarity', 'SR');
            },
        ])
            ->with('pity')
            ->has('pulls')
            ->orderByDesc('pulls_count')
            ->take(20)
            ->get()
            ->map(function ($b) {
                $rate = $b->pulls_count > 0 ? round(($b->ssr_count / $b->pulls_count) * 100, 2) : 0.0;
                $bRate = (float) ($b->base_rate ?? 3.00);
                $bPity = $b->pity?->current_pity ?? min(200, $b->pulls_count);

                return [
                    'id' => $b->id,
                    'name' => $b->name,
                    'category' => $b->category,
                    'banner_type' => $b->banner_type,
                    'base_rate' => $bRate,
                    'start_date' => $b->start_date ? $b->start_date->format('Y-m-d') : null,
                    'end_date' => $b->end_date ? $b->end_date->format('Y-m-d') : null,
                    'pulls_count' => $b->pulls_count,
                    'current_pity' => $bPity,
                    'pulls_to_spark' => max(0, 200 - $bPity),
                    'ssr_count' => $b->ssr_count,
                    'sr_count' => $b->sr_count,
                    'ssr_rate' => $rate,
                    'luck_diff' => round($rate - $bRate, 2),
                    'is_boosted' => $bRate > 3.00,
                ];
            });

        // Calculate Pity Intervals (distance in pulls to hit each SSR)
        $allPullsForIntervals = (clone $query)
            ->with('banner:id,name,base_rate')
            ->orderBy('pulled_at', 'asc')
            ->orderBy('id', 'asc')
            ->get(['id', 'gacha_banner_id', 'item_name', 'rarity', 'is_rate_up', 'pulled_at']);

        $ssrIntervals = [];
        $counter = 0;
        $ssrNumber = 0;
        foreach ($allPullsForIntervals as $p) {
            $counter++;
            if ($p->rarity === 'SSR') {
                $ssrNumber++;
                $bRate = (float) ($p->banner?->base_rate ?? 3.00);
                $ssrIntervals[] = [
                    'ssr_number' => $ssrNumber,
                    'label' => "SSR #{$ssrNumber}",
                    'item_name' => $p->item_name,
                    'pulls_count' => $counter,
                    'pulls_needed' => $counter,
                    'is_rate_up' => (bool) $p->is_rate_up,
                    'banner_base_rate' => $bRate,
                    'is_boosted' => $bRate > 3.00,
                    'pulled_at' => Carbon::parse($p->pulled_at)->format('Y-m-d'),
                ];
                $counter = 0;
            }
        }

        return response()->json([
            'total_pulls' => $totalPulls,
            'ssr_count' => $ssrCount,
            'sr_count' => $srCount,
            'r_count' => $rCount,
            'rate_up_count' => $rateUpCount,
            'ssr_rate' => $ssrRate,
            'base_rate' => $baseRate,
            'luck_diff' => $luckDiff,
            'rate_pool' => $ratePool,
            'banner_type' => $bannerType,
            'categories' => $categories,
            'pools' => $pools,
            'character_pity' => $characterPity,
            'support_card_pity' => $supportPity,
            'active_pity' => $activePity,
            'active_banner_name' => $activeBannerName,
            'active_banner_id' => $activeBannerId,
            'spark_target' => 200,
            'rarity_distribution' => $rarityDistribution,
            'recent_ssr' => $recentSsr,
            'banner_breakdown' => $bannerBreakdown,
            'ssr_intervals' => $ssrIntervals,
            'luck_analysis' => $luckAnalysis,
            'luck_percentile' => $allPercentile,
            'luck_tier' => $allTier['tier'],
            'luck_tier_label' => $allTier['label'],
        ]);
    }

    /**
     * Reset pity counter (or claim spark).
     */
    public function resetPity(Request $request): JsonResponse
    {
        $bannerType = $request->input('banner_type', 'character');
        $gachaBannerId = $request->input('gacha_banner_id');

        if ($gachaBannerId !== null && $gachaBannerId !== '' && $gachaBannerId !== 'all') {
            $gachaBannerId = (int) $gachaBannerId;
            $banner = GachaBanner::find($gachaBannerId);
            if ($banner) {
                $bannerType = $banner->banner_type;
            }
        } else {
            $gachaBannerId = null;
        }

        $pity = GachaPity::forBanner($bannerType, $gachaBannerId);
        $previousPity = $pity->current_pity;

        $pity->current_pity = 0;
        $pity->total_sparks = ($pity->total_sparks ?? 0) + 1;
        $pity->last_reset_at = now();
        $pity->save();

        GachaPity::recalculate($bannerType, $gachaBannerId);

        $targetName = isset($banner) ? $banner->name : ($bannerType === 'support_card' ? 'Support Card' : 'Character');

        return response()->json([
            'message' => "Pity counter for {$targetName} reset to 0 (was {$previousPity}).",
            'banner_type' => $bannerType,
            'gacha_banner_id' => $gachaBannerId,
            'current_pity' => 0,
            'total_sparks' => $pity->total_sparks,
        ]);
    }

    /**
     * Return available characters and support cards for gacha autocomplete.
     */
    public function metadata(): JsonResponse
    {
        return response()->json([
            'characters' => UmaCatalog::getCharacters(),
            'character_rarities' => UmaCatalog::getCharacterRarities(),
            'support_cards' => UmaCatalog::getSupportCards(),
        ]);
    }

    /**
     * Get GameTora catalog synchronization status.
     */
    public function syncStatus(GameToraSyncService $service): JsonResponse
    {
        return response()->json($service->getStatus());
    }

    /**
     * Synchronize catalog with GameTora JP production dataset.
     */
    public function syncCatalog(Request $request, GameToraSyncService $service): JsonResponse
    {
        $force = $request->boolean('force');
        $result = $service->sync($force);

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    /**
     * Compute Cumulative Binomial Distribution P(X <= k) for n trials with success rate p.
     * Uses log-gamma exact summation for n <= 3000 and continuity-corrected normal approximation for large n.
     */
    public function computeBinomialCdf(int $n, int $k, float $p): float
    {
        if ($n <= 0) {
            return 50.0;
        }
        if ($k < 0) {
            return 0.0;
        }
        if ($k >= $n) {
            return 100.0;
        }
        if ($p <= 0.0) {
            return 100.0;
        }
        if ($p >= 1.0) {
            return $k >= $n ? 100.0 : 0.0;
        }

        // Exact summation using log-gamma for precision
        if ($n <= 3000) {
            $sum = 0.0;
            $logP = log($p);
            $log1p = log(1.0 - $p);

            for ($x = 0; $x <= $k; $x++) {
                $logBinomialCoeff = $this->logGamma($n + 1) - $this->logGamma($x + 1) - $this->logGamma($n - $x + 1);
                $logProb = $logBinomialCoeff + ($x * $logP) + (($n - $x) * $log1p);
                $sum += exp($logProb);
            }

            $cdf = min(1.0, max(0.0, $sum));

            return round($cdf * 100.0, 2);
        }

        // Normal approximation with continuity correction
        $mean = $n * $p;
        $variance = $n * $p * (1.0 - $p);
        $stdDev = sqrt($variance);

        if ($stdDev <= 0) {
            return $k >= $mean ? 100.0 : 0.0;
        }

        $z = ($k + 0.5 - $mean) / $stdDev;
        $cdf = 0.5 * (1.0 + $this->erf($z / sqrt(2.0)));

        return round(min(1.0, max(0.0, $cdf)) * 100.0, 2);
    }

    /**
     * Approximation of error function erf(x) via Abramowitz & Stegun.
     */
    public function erf(float $x): float
    {
        $sign = $x < 0 ? -1.0 : 1.0;
        $absX = abs($x);

        $a1 = 0.254829592;
        $a2 = -0.284496736;
        $a3 = 1.421413741;
        $a4 = -1.453152027;
        $a5 = 1.061405429;
        $p = 0.3275911;

        $t = 1.0 / (1.0 + $p * $absX);
        $y = 1.0 - ((((($a5 * $t + $a4) * $t) + $a3) * $t + $a2) * $t + $a1) * $t * exp(-$absX * $absX);

        return $sign * $y;
    }

    /**
     * Compute log-gamma ln(Gamma(x)) using Lanczos approximation (g=5, n=7).
     */
    public function logGamma(float $x): float
    {
        $p = [
            1.000000000190015,
            76.18009172947146,
            -86.50532032941677,
            24.01409824083091,
            -1.231739572450155,
            0.001208650973866179,
            -0.000005395239384953,
        ];

        $y = $x;
        $tmp = $x + 5.5;
        $tmp -= ($x + 0.5) * log($tmp);
        $ser = $p[0];
        for ($j = 1; $j <= 6; $j++) {
            $y += 1.0;
            $ser += $p[$j] / $y;
        }

        return -$tmp + log(2.5066282746310005 * $ser / $x);
    }

    /**
     * Determine Luck Tier from percentile.
     *
     * @return array{tier: string, label: string, color: string, badge: string}
     */
    public function resolveLuckTier(float $percentile): array
    {
        if ($percentile >= 85.0) {
            return [
                'tier' => 'blessed',
                'label' => 'Blessed / Ultra Lucky',
                'color' => 'amber',
                'badge' => 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
            ];
        }
        if ($percentile >= 60.0) {
            return [
                'tier' => 'lucky',
                'label' => 'Above Average / Lucky',
                'color' => 'emerald',
                'badge' => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
            ];
        }
        if ($percentile >= 40.0) {
            return [
                'tier' => 'average',
                'label' => 'Average / On-Rate',
                'color' => 'blue',
                'badge' => 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
            ];
        }
        if ($percentile >= 15.0) {
            return [
                'tier' => 'unlucky',
                'label' => 'Unlucky',
                'color' => 'orange',
                'badge' => 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
            ];
        }

        return [
            'tier' => 'cursed',
            'label' => 'Cursed / Extreme Salty',
            'color' => 'rose',
            'badge' => 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
        ];
    }

    /**
     * Compute custom luck percentile or interactive pull probability simulation.
     */
    public function luckPercentile(Request $request): JsonResponse
    {
        $validator = validator($request->all(), [
            'pulls' => 'sometimes|integer|min:1',
            'n' => 'sometimes|integer|min:1',
            'ssr' => 'sometimes|integer|min:0',
            'k' => 'sometimes|integer|min:0',
            'rate' => 'sometimes|numeric|min:0|max:100',
            'p' => 'sometimes|numeric|min:0|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $n = (int) $request->input('n', $request->input('pulls', 0));
        $k = (int) $request->input('k', $request->input('ssr', 0));

        if ($request->filled('pulls') && (int) $request->input('pulls') < 1) {
            return response()->json([
                'success' => false,
                'errors' => ['pulls' => ['Total pull harus minimal 1.']],
            ], 422);
        }

        if ($k > $n && $n > 0) {
            return response()->json([
                'success' => false,
                'errors' => ['ssr' => ['Jumlah SSR ($k) tidak boleh melebihi total pull ($n).']],
            ], 422);
        }

        $rawRate = $request->input('rate', $request->input('p', 0.03));
        $p = (float) $rawRate;
        if ($p > 1.0) {
            $p = $p / 100.0;
        }
        if ($p <= 0) {
            $p = 0.03;
        }

        $percentile = $n > 0 ? $this->computeBinomialCdf($n, $k, $p) : 50.0;
        $tier = $this->resolveLuckTier($percentile);

        // Interactive simulation: convert carats & tickets to pulls
        $carats = (int) $request->input('carats', 0);
        $tickets = (int) $request->input('tickets', 0);
        $simPulls = (int) floor($carats / 150) + $tickets;
        $targetP = (float) $request->input('target_p', 0.0075); // default rate-up 0.75%
        if ($targetP > 1.0) {
            $targetP = $targetP / 100.0;
        }

        $probAtLeastOne = $simPulls > 0 ? round((1.0 - pow(1.0 - $targetP, $simPulls)) * 100.0, 2) : 0.0;
        $probAtLeastTwo = $simPulls > 1 ? round((1.0 - (pow(1.0 - $targetP, $simPulls) + ($simPulls * $targetP * pow(1.0 - $targetP, $simPulls - 1)))) * 100.0, 2) : 0.0;

        return response()->json([
            'success' => true,
            'data' => [
                'n' => $n,
                'k' => $k,
                'p' => $p,
                'percentile' => $percentile,
                'tier' => [
                    'key' => $tier['tier'],
                    'name' => $tier['label'],
                    'color' => $tier['color'],
                ],
            ],
            'luck' => [
                'n' => $n,
                'k' => $k,
                'p' => $p,
                'percentile' => $percentile,
                'tier' => $tier['tier'],
                'tier_label' => $tier['label'],
            ],
            'simulation' => [
                'carats' => $carats,
                'tickets' => $tickets,
                'total_pulls' => $simPulls,
                'target_p' => $targetP,
                'prob_at_least_one' => $probAtLeastOne,
                'prob_at_least_two' => $probAtLeastTwo,
            ],
        ]);
    }
}
