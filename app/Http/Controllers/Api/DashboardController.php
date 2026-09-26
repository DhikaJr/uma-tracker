<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CareerRun;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Aggregated summary for the main Dashboard view.
     */
    public function summary(Request $request): JsonResponse
    {
        $baseRate = (float) $request->input('base_rate', 3.00);
        if ($baseRate <= 0) {
            $baseRate = 3.00;
        }

        // Gacha Metrics
        $totalPulls = GachaPull::count();
        $ssrPulls = GachaPull::where('rarity', 'SSR')->count();
        $ssrRate = $totalPulls > 0 ? round(($ssrPulls / $totalPulls) * 100, 2) : 0.0;
        // Active Banner Pity Spark
        $bannerPities = GachaPity::whereNotNull('gacha_banner_id')
            ->where('current_pity', '>', 0)
            ->with('banner:id,name,banner_type,category,base_rate')
            ->orderByDesc('current_pity')
            ->get()
            ->map(fn ($p) => [
                'banner_id' => $p->gacha_banner_id,
                'name' => $p->banner?->name,
                'banner_type' => $p->banner_type,
                'category' => $p->banner?->category,
                'base_rate' => (float) ($p->banner?->base_rate ?? 3.0),
                'current_pity' => $p->current_pity,
                'pulls_to_spark' => max(0, 200 - $p->current_pity),
                'pity_percent' => min(100, (int) round(($p->current_pity / 200) * 100)),
            ]);

        $topBannerPity = $bannerPities->first();
        if ($topBannerPity) {
            $activePity = $topBannerPity['current_pity'];
            $activeBannerName = $topBannerPity['name'];
            $activeBannerId = $topBannerPity['banner_id'];
        } else {
            $unassignedChar = GachaPity::forBanner('character', null);
            $unassignedSupp = GachaPity::forBanner('support_card', null);
            $activePity = max($unassignedChar->current_pity, $unassignedSupp->current_pity);
            $activeBannerName = null;
            $activeBannerId = null;
        }

        $characterPity = GachaPity::forBanner('character', null)->current_pity;
        $supportPity = GachaPity::forBanner('support_card', null)->current_pity;

        // Career Metrics
        $totalRuns = CareerRun::count();
        $totalFans = (int) CareerRun::sum('fans_gained');

        $currentMonth = Carbon::now();
        $monthlyFans = (int) CareerRun::whereYear('run_date', $currentMonth->year)
            ->whereMonth('run_date', $currentMonth->month)
            ->sum('fans_gained');

        $avgFans = $totalRuns > 0 ? (int) round($totalFans / $totalRuns) : 0;

        $bestRun = CareerRun::orderBy('fans_gained', 'desc')->first();

        // Recent 5 Pulls
        $recentPulls = GachaPull::orderBy('pulled_at', 'desc')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        // Recent 5 Career Runs
        $recentRuns = CareerRun::orderBy('run_date', 'desc')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        // Fan trend data for mini dashboard chart (last 7 recorded dates)
        $fanTrends = CareerRun::select(
            'run_date',
            DB::raw('SUM(fans_gained) as total_fans'),
            DB::raw('COUNT(*) as runs_count')
        )
            ->groupBy('run_date')
            ->orderBy('run_date', 'asc')
            ->take(7)
            ->get();

        // Rarity distribution for donut chart
        $rPulls = GachaPull::where('rarity', 'R')->count();
        $srPulls = GachaPull::where('rarity', 'SR')->count();
        $rarityDistribution = [
            ['name' => 'SSR', 'count' => $ssrPulls, 'color' => '#f59e0b'],
            ['name' => 'SR', 'count' => $srPulls, 'color' => '#94a3b8'],
            ['name' => 'R', 'count' => $rPulls, 'color' => '#d97706'],
        ];

        // Isolated Pools for accurate SSR rate display
        $standardTotal = GachaPull::where(function ($q) {
            $q->whereNull('gacha_banner_id')
                ->orWhereHas('banner', fn ($bq) => $bq->where('base_rate', '<=', 3.0));
        })->count();
        $standardSsr = GachaPull::where('rarity', 'SSR')->where(function ($q) {
            $q->whereNull('gacha_banner_id')
                ->orWhereHas('banner', fn ($bq) => $bq->where('base_rate', '<=', 3.0));
        })->count();
        $standardRate = $standardTotal > 0 ? round(($standardSsr / $standardTotal) * 100, 2) : 0.0;
        $standardLuckDiff = round($standardRate - 3.00, 2);

        $boostedTotal = GachaPull::whereHas('banner', fn ($bq) => $bq->where('base_rate', '>', 3.0))->count();
        $boostedSsr = GachaPull::where('rarity', 'SSR')->whereHas('banner', fn ($bq) => $bq->where('base_rate', '>', 3.0))->count();
        $boostedRate = $boostedTotal > 0 ? round(($boostedSsr / $boostedTotal) * 100, 2) : 0.0;
        $boostedLuckDiff = round($boostedRate - 4.50, 2);

        $pools = [
            'all' => [
                'name' => 'Semua',
                'base_rate' => $baseRate,
                'total_pulls' => $totalPulls,
                'ssr_count' => $ssrPulls,
                'ssr_rate' => $ssrRate,
                'luck_diff' => round($ssrRate - $baseRate, 2),
            ],
            'standard' => [
                'name' => 'Standar (3.0%)',
                'base_rate' => 3.00,
                'total_pulls' => $standardTotal,
                'ssr_count' => $standardSsr,
                'ssr_rate' => $standardRate,
                'luck_diff' => $standardLuckDiff,
            ],
            'boosted' => [
                'name' => 'Boosted (4.5%)',
                'base_rate' => 4.50,
                'total_pulls' => $boostedTotal,
                'ssr_count' => $boostedSsr,
                'ssr_rate' => $boostedRate,
                'luck_diff' => $boostedLuckDiff,
            ],
        ];

        // Active Banners Today
        $today = Carbon::now()->format('Y-m-d');

        $charCatalog = UmaCatalogItem::where('type', 'character')
            ->get(['name', 'rarity', 'raw_data']);
        $charCatalogMap = [];
        foreach ($charCatalog as $c) {
            $norm = mb_strtolower(trim($c->name));
            $r = 3;
            if (isset($c->raw_data['rarity'])) {
                $r = (int) $c->raw_data['rarity'];
            } elseif ($c->rarity === 'R') {
                $r = 1;
            } elseif ($c->rarity === 'SR') {
                $r = 2;
            }
            $charCatalogMap[$norm] = $r;
        }

        $b1Map = [
            'Agnes Tachyon' => ['tach-nology'],
            'Haru Urara' => ['bestest prize'],
            'King Halo' => ['king of emeralds'],
            'Matikanefukukitaru' => ['rising☆fortune', 'fortune'],
            'Mejiro Ryan' => ['down the line'],
            'Nice Nature' => ['poinsettia ribbon', 'poinsettia'],
            'Sakura Bakushin O' => ['blossom in learning'],
            'Twin Turbo' => ['turbo engine'],
            'Winning Ticket' => ['get to winning'],
        ];

        $b2Map = [
            'Air Groove' => ['empress road'],
            'Biko Pegasus' => ['疾風ペガサス', 'pega'],
            'Daiwa Scarlet' => ['peak blue'],
            'El Condor Pasa' => ['el☆número', 'el numero', 'numero'],
            'Gold Ship' => ['red strife'],
            'Grass Wonder' => ['stone-piercing blue', 'stone-piercing'],
            'Ikuno Dictus' => ['mantle of steel'],
            'Matikanetannhauser' => ['clippety-tippety-clop', 'clippety'],
            'Mayano Top Gun' => ['scramble☆zone', 'scramble'],
            'Royce and Royce' => ['inspiring genius'],
            'Super Creek' => ['murmuring stream'],
            'Tsurumaru Tsuyoshi' => ['志、高し', 'tsuyoshi'],
            'Vodka' => ['wild top gear'],
        ];

        $activeBanners = GachaBanner::where('start_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $today);
            })
            ->whereNotNull('featured_items')
            ->whereNotIn('name', [
                'Pretty Derby Gacha: Pickup Character',
                'Support Card Gacha: Pickup Support Card',
            ])
            ->where(function ($q) {
                $q->whereNull('end_date')->orWhere('end_date', '<', '2040-01-01');
            })
            ->orderBy('start_date', 'desc')
            ->get()
            ->filter(function ($b) {
                return ! empty($b->featured_items) && count($b->featured_items) > 0;
            })
            ->values()
            ->map(function ($b) use ($today, $charCatalogMap, $b1Map, $b2Map) {
                $start = $b->start_date ? Carbon::parse($b->start_date) : null;
                $end = $b->end_date ? Carbon::parse($b->end_date) : null;
                $daysRemaining = $end ? (int) max(0, Carbon::parse($today)->diffInDays($end, false)) : null;

                $isSupport = $b->banner_type === 'support_card';

                $formattedItems = collect($b->featured_items ?? [])->map(function ($itemName) use ($isSupport, $charCatalogMap, $b1Map, $b2Map) {
                    if (is_array($itemName)) {
                        return $itemName;
                    }

                    if ($isSupport) {
                        $rarity = 'SSR';
                        if (str_starts_with($itemName, 'SR ')) {
                            $rarity = 'SR';
                        } elseif (str_starts_with($itemName, 'R ')) {
                            $rarity = 'R';
                        }

                        return [
                            'name' => $itemName,
                            'is_support' => true,
                            'rarity' => $rarity,
                            'tier_label' => $rarity,
                            'badge_text' => $rarity,
                            'stars' => null,
                            'star_text' => null,
                        ];
                    }

                    $norm = mb_strtolower(trim($itemName));
                    $stars = 3;
                    if (isset($charCatalogMap[$norm])) {
                        $stars = $charCatalogMap[$norm];
                    } else {
                        foreach ($b1Map as $charName => $epithets) {
                            if (stripos($itemName, $charName) !== false) {
                                if (! str_contains($itemName, '[')) {
                                    $stars = 1;
                                    break;
                                }
                                foreach ($epithets as $ep) {
                                    if (stripos($itemName, $ep) !== false) {
                                        $stars = 1;
                                        break 2;
                                    }
                                }
                            }
                        }
                        if ($stars === 3) {
                            foreach ($b2Map as $charName => $epithets) {
                                if (stripos($itemName, $charName) !== false) {
                                    if (! str_contains($itemName, '[')) {
                                        $stars = 2;
                                        break;
                                    }
                                    foreach ($epithets as $ep) {
                                        if (stripos($itemName, $ep) !== false) {
                                            $stars = 2;
                                            break 2;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return [
                        'name' => $itemName,
                        'is_support' => false,
                        'stars' => $stars,
                        'rarity' => "{$stars}★",
                        'tier_label' => "B{$stars}",
                        'star_text' => str_repeat('★', $stars),
                        'badge_text' => str_repeat('★', $stars)." (B{$stars})",
                    ];
                })->all();

                return [
                    'id' => $b->id,
                    'name' => $b->name,
                    'banner_type' => $b->banner_type,
                    'category' => $b->category,
                    'base_rate' => (float) ($b->base_rate ?? 3.0),
                    'start_date' => $start ? $start->format('Y-m-d') : null,
                    'end_date' => $end ? $end->format('Y-m-d') : null,
                    'days_remaining' => $daysRemaining,
                    'featured_items' => $formattedItems,
                ];
            });

        return response()->json([
            'gacha' => [
                'total_pulls' => $totalPulls,
                'ssr_count' => $ssrPulls,
                'ssr_rate' => $ssrRate,
                'base_rate' => $baseRate,
                'luck_diff' => round($ssrRate - $baseRate, 2),
                'character_pity' => $characterPity,
                'support_pity' => $supportPity,
                'active_pity' => $activePity,
                'active_banner_name' => $activeBannerName,
                'active_banner_id' => $activeBannerId,
                'banner_pities' => $bannerPities,
                'spark_target' => 200,
                'rarity_distribution' => $rarityDistribution,
                'pools' => $pools,
            ],
            'career' => [
                'total_runs' => $totalRuns,
                'total_fans' => $totalFans,
                'monthly_fans' => $monthlyFans,
                'avg_fans' => $avgFans,
                'best_run' => $bestRun,
            ],
            'active_banners' => $activeBanners,
            'recent_pulls' => $recentPulls,
            'recent_runs' => $recentRuns,
            'fan_trends' => $fanTrends,
        ]);
    }
}
