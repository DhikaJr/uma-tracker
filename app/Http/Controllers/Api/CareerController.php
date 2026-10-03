<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkDeleteRequest;
use App\Http\Requests\StoreCareerRunRequest;
use App\Http\Requests\UpdateCareerRunRequest;
use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\UmaCatalogItem;
use App\Support\UmaCatalog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CareerController extends Controller
{
    /**
     * List career runs with pagination and filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CareerRun::query();

        if ($request->filled('date_from')) {
            $query->whereDate('run_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('run_date', '<=', $request->date_to);
        }

        if ($request->filled('scenario') && $request->scenario !== 'all') {
            $query->where('scenario', $request->scenario);
        }

        if ($request->filled('uma_name')) {
            $query->where('uma_name', 'like', '%'.$request->uma_name.'%');
        }

        if ($request->filled('rank') && $request->rank !== 'all') {
            $query->where('final_rank', $request->rank);
        }

        // Rank range filtering (e.g. rank_min = 'S', rank_max = 'UE')
        if ($request->filled('rank_min') || $request->filled('rank_max')) {
            $orderedRanks = array_keys(UmaCatalog::getRankScoreThresholds());
            $cleanMin = $request->filled('rank_min') ? str_replace(' ', '+', (string) $request->rank_min) : null;
            $cleanMax = $request->filled('rank_max') ? str_replace(' ', '+', (string) $request->rank_max) : null;

            $minIndex = ($cleanMin && ($idx = array_search($cleanMin, $orderedRanks)) !== false) ? $idx : 0;
            $maxIndex = ($cleanMax && ($idx = array_search($cleanMax, $orderedRanks)) !== false) ? $idx : (count($orderedRanks) - 1);

            if ($minIndex > 0 || $maxIndex < (count($orderedRanks) - 1)) {
                $allowedRanks = array_slice($orderedRanks, $minIndex, max(1, $maxIndex - $minIndex + 1));
                $query->whereIn('final_rank', $allowedRanks);
            }
        }

        if ($request->filled('training_type') && $request->training_type !== 'all') {
            $query->where('training_type', $request->training_type);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('uma_name', 'like', '%'.$request->search.'%')
                    ->orWhere('notes', 'like', '%'.$request->search.'%');
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 15, 20, 25, 50, 100], true) ? $perPage : 10;

        $runs = $query->orderBy('run_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage);

        return response()->json($runs);
    }

    /**
     * Store a career run.
     */
    public function store(StoreCareerRunRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (! empty($data['evaluation_score']) && empty($data['final_rank'])) {
            $data['final_rank'] = UmaCatalog::getRankFromScore((int) $data['evaluation_score']);
        }

        $run = CareerRun::create($data);

        return response()->json([
            'message' => 'Catatan career run berhasil dicatat.',
            'data' => $run,
        ], 201);
    }

    /**
     * Update a career run.
     */
    public function update(UpdateCareerRunRequest $request, int $id): JsonResponse
    {
        $data = $request->validated();
        if (! empty($data['evaluation_score']) && empty($data['final_rank'])) {
            $data['final_rank'] = UmaCatalog::getRankFromScore((int) $data['evaluation_score']);
        }

        $run = CareerRun::findOrFail($id);
        $run->update($data);

        return response()->json([
            'message' => 'Catatan career run berhasil diperbarui.',
            'data' => $run,
        ]);
    }

    /**
     * Delete a career run.
     */
    public function destroy(int $id): JsonResponse
    {
        $run = CareerRun::findOrFail($id);
        $run->delete();

        return response()->json([
            'message' => 'Catatan career run berhasil dihapus.',
        ]);
    }

    /**
     * Delete multiple career runs in bulk.
     */
    public function bulkDestroy(BulkDeleteRequest $request): JsonResponse
    {
        $ids = $request->validated()['ids'];
        $deleted = CareerRun::whereIn('id', $ids)->delete();

        return response()->json([
            'success' => true,
            'message' => "{$deleted} data career run berhasil dihapus.",
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * Career performance stats: total fans, monthly fans for circle quota,
     * avg fans, highest record, scenario breakdown, and daily trends.
     */
    public function stats(Request $request): JsonResponse
    {
        $totalRuns = CareerRun::count();
        $totalFans = (int) CareerRun::sum('fans_gained');

        $currentMonth = Carbon::now();
        $monthlyFans = (int) CareerRun::whereYear('run_date', $currentMonth->year)
            ->whereMonth('run_date', $currentMonth->month)
            ->sum('fans_gained');

        $monthlyRuns = CareerRun::whereYear('run_date', $currentMonth->year)
            ->whereMonth('run_date', $currentMonth->month)
            ->count();

        $avgFans = $totalRuns > 0 ? (int) round($totalFans / $totalRuns) : 0;

        // Single run record
        $recordRun = CareerRun::orderBy('fans_gained', 'desc')
            ->first();

        // Scenario performance breakdown
        $scenarioStats = CareerRun::select(
            'scenario',
            DB::raw('COUNT(*) as runs_count'),
            DB::raw('SUM(fans_gained) as total_fans'),
            DB::raw('ROUND(AVG(fans_gained)) as avg_fans'),
            DB::raw('MIN(fans_gained) as min_fans'),
            DB::raw('MAX(fans_gained) as max_fans')
        )
            ->groupBy('scenario')
            ->orderBy('avg_fans', 'desc')
            ->get();

        // Range-based Daily fan gain trend (this_month, 7_days, 30_days, all)
        $range = $request->input('range', 'this_month');
        $now = Carbon::now();

        if ($range === '7_days') {
            $startDate = $now->copy()->subDays(6)->startOfDay();
            $endDate = $now->copy()->endOfDay();
        } elseif ($range === '30_days') {
            $startDate = $now->copy()->subDays(29)->startOfDay();
            $endDate = $now->copy()->endOfDay();
        } elseif ($range === 'all') {
            $firstRun = CareerRun::orderBy('run_date', 'asc')->first();
            $startDate = $firstRun ? Carbon::parse($firstRun->run_date)->startOfDay() : $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfDay();
        } else { // 'this_month'
            $startDate = $now->copy()->startOfMonth();
            $endDate = $now->copy()->endOfMonth();
        }

        $dailyData = CareerRun::whereBetween('run_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->select(
                'run_date',
                DB::raw('SUM(fans_gained) as fans_gained'),
                DB::raw('COUNT(*) as runs_count')
            )
            ->groupBy('run_date')
            ->orderBy('run_date', 'asc')
            ->get();

        // If no records in current month and range is not explicitly given, fallback to latest runs
        if ($dailyData->isEmpty() && ! $request->has('range') && CareerRun::exists()) {
            $dailyData = CareerRun::select(
                'run_date',
                DB::raw('SUM(fans_gained) as fans_gained'),
                DB::raw('COUNT(*) as runs_count')
            )
                ->groupBy('run_date')
                ->orderBy('run_date', 'asc')
                ->take(30)
                ->get();
        }

        $dailyTrends = [];
        $cumulative = 0;
        foreach ($dailyData as $item) {
            $dateStr = Carbon::parse($item->run_date)->format('Y-m-d');
            $fans = (int) $item->fans_gained;
            $cumulative += $fans;
            $dailyTrends[] = [
                'run_date' => $dateStr,
                'date' => Carbon::parse($item->run_date)->format('d M'),
                'fans_gained' => $fans,
                'cumulative_fans' => $cumulative,
                'runs_count' => (int) $item->runs_count,
            ];
        }

        $settings = AppSetting::getAll();
        $circleGoal = isset($settings['circle_goal']) ? (int) $settings['circle_goal'] : 20000000;

        // Top Umas by runs
        $topUmas = CareerRun::select(
            'uma_name',
            DB::raw('COUNT(*) as runs_count'),
            DB::raw('SUM(fans_gained) as total_fans'),
            DB::raw('MAX(final_rank) as best_rank')
        )
            ->groupBy('uma_name')
            ->orderBy('runs_count', 'desc')
            ->take(5)
            ->get();

        // Character performance breakdown
        $characterStats = CareerRun::select(
            'uma_name',
            DB::raw('COUNT(*) as runs_count'),
            DB::raw('SUM(fans_gained) as total_fans'),
            DB::raw('ROUND(AVG(fans_gained)) as avg_fans'),
            DB::raw('MIN(fans_gained) as min_fans'),
            DB::raw('MAX(fans_gained) as max_fans')
        )
            ->groupBy('uma_name')
            ->orderBy('avg_fans', 'desc')
            ->get();

        $manualRuns = CareerRun::where('training_type', 'manual')->count();
        $independentRuns = CareerRun::where('training_type', 'independent')->count();

        return response()->json([
            'total_runs' => $totalRuns,
            'total_fans' => $totalFans,
            'monthly_fans' => $monthlyFans,
            'monthly_runs' => $monthlyRuns,
            'monthly_circle_target' => $circleGoal,
            'manual_runs' => $manualRuns,
            'independent_runs' => $independentRuns,
            'avg_fans' => $avgFans,
            'record_run' => $recordRun,
            'scenario_stats' => $scenarioStats,
            'character_stats' => $characterStats,
            'daily_trends' => $dailyTrends,
            'top_umas' => $topUmas,
        ]);
    }

    /**
     * Get scenario performance detail, character breakdown, and recent runs.
     */
    public function scenarioDetail(Request $request): JsonResponse
    {
        $scenario = $request->query('scenario');
        if (! $scenario) {
            return response()->json([
                'message' => 'Parameter scenario wajib diisi.',
            ], 422);
        }

        $runsQuery = CareerRun::where('scenario', $scenario);
        $totalRuns = (clone $runsQuery)->count();

        if ($totalRuns === 0) {
            return response()->json([
                'scenario' => $scenario,
                'total_runs' => 0,
                'total_fans' => 0,
                'avg_fans' => 0,
                'min_fans' => 0,
                'max_fans' => 0,
                'characters' => [],
                'recent_runs' => [],
            ]);
        }

        $totalFans = (int) (clone $runsQuery)->sum('fans_gained');
        $avgFans = (int) round($totalFans / $totalRuns);
        $minFans = (int) (clone $runsQuery)->min('fans_gained');
        $maxFans = (int) (clone $runsQuery)->max('fans_gained');

        // Character breakdown in this scenario
        $charStats = (clone $runsQuery)
            ->select(
                'uma_name',
                DB::raw('COUNT(*) as runs_count'),
                DB::raw('SUM(fans_gained) as total_fans'),
                DB::raw('ROUND(AVG(fans_gained)) as avg_fans'),
                DB::raw('MIN(fans_gained) as min_fans'),
                DB::raw('MAX(fans_gained) as max_fans'),
                DB::raw('MAX(evaluation_score) as max_score')
            )
            ->groupBy('uma_name')
            ->orderBy('total_fans', 'desc')
            ->get();

        $catalogItems = UmaCatalogItem::where('type', 'character')->get(['name', 'gametora_id', 'raw_data']);

        $characters = $charStats->map(function ($item) use ($catalogItems, $scenario) {
            $baseName = trim(explode(' [', $item->uma_name)[0]);
            $matchedCatalog = $catalogItems->first(fn ($c) => $c->name === $item->uma_name)
                ?: $catalogItems->first(fn ($c) => trim(explode(' [', $c->name)[0]) === $baseName);

            $imageUrl = null;
            if ($matchedCatalog && is_array($matchedCatalog->raw_data)) {
                $raw = $matchedCatalog->raw_data;
                if (! empty($raw['image_url'])) {
                    $imageUrl = (string) $raw['image_url'];
                } else {
                    $charId = $raw['char_id'] ?? null;
                    $cardId = $raw['card_id'] ?? $matchedCatalog->gametora_id ?? null;
                    if ($charId && $cardId) {
                        $imageUrl = "https://gametora.com/images/umamusume/characters/thumb/chara_stand_{$charId}_{$cardId}.png";
                    } else {
                        $imageUrl = $raw['icon'] ?? $raw['thumb'] ?? null;
                    }
                }
            }

            // Find best rank achieved
            $bestRun = CareerRun::where('scenario', $scenario)
                ->where('uma_name', $item->uma_name)
                ->whereNotNull('final_rank')
                ->orderBy('evaluation_score', 'desc')
                ->orderBy('fans_gained', 'desc')
                ->first();

            $bestRank = $bestRun?->final_rank;
            if (! $bestRank && ! empty($item->max_score)) {
                $bestRank = UmaCatalog::getRankFromScore((int) $item->max_score);
            }
            if (! $bestRank) {
                $bestRank = 'G';
            }

            return [
                'uma_name' => $item->uma_name,
                'image_url' => $imageUrl,
                'runs_count' => (int) $item->runs_count,
                'total_fans' => (int) $item->total_fans,
                'avg_fans' => (int) $item->avg_fans,
                'min_fans' => (int) $item->min_fans,
                'max_fans' => (int) $item->max_fans,
                'best_score' => $item->max_score ? (int) $item->max_score : null,
                'best_rank' => $bestRank,
            ];
        });

        // Recent runs in this scenario (up to 25)
        $recentRuns = (clone $runsQuery)
            ->orderBy('run_date', 'desc')
            ->orderBy('id', 'desc')
            ->take(25)
            ->get();

        return response()->json([
            'scenario' => $scenario,
            'total_runs' => $totalRuns,
            'total_fans' => $totalFans,
            'avg_fans' => $avgFans,
            'min_fans' => $minFans,
            'max_fans' => $maxFans,
            'characters' => $characters,
            'recent_runs' => $recentRuns,
        ]);
    }

    /**
     * Return available scenarios and rank definitions for frontend select options.
     */
    public function metadata(): JsonResponse
    {
        return response()->json([
            'scenarios' => UmaCatalog::getScenarios(),
            'ranks' => UmaCatalog::getRanks(),
            'rank_thresholds' => UmaCatalog::getRankScoreThresholdList(),
            'uma_presets' => UmaCatalog::getBaseUmaList(),
            'uma_stars' => UmaCatalog::getBaseUmaStarRatings(),
            'uma_ocr_map' => UmaCatalog::getOcrLookupMap(),
        ]);
    }
}
