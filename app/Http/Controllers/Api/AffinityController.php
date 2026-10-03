<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CareerRun;
use App\Services\UmaAffinityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AffinityController extends Controller
{
    public function __construct(
        protected UmaAffinityService $affinityService
    ) {}

    /**
     * Calculate compatibility and affinity score for a 7-slot pedigree tree.
     */
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_id' => ['nullable'],
            'target' => ['nullable'],
            'p1_tree' => ['nullable', 'array'],
            'p1' => ['nullable'],
            'p2_tree' => ['nullable', 'array'],
            'p2' => ['nullable'],
            'shared_g1_races' => ['nullable', 'array'],
            'points_per_race' => ['nullable', 'integer', 'min:1', 'max:5'],
            'method' => ['nullable', 'string', 'in:pairwise,triple'],
        ]);

        $rawTarget = $validated['target_id'] ?? ($validated['target'] ?? null);
        $targetId = is_numeric($rawTarget) ? (int) $rawTarget : ($this->affinityService->resolveCharId($rawTarget) ?? 0);

        /** @var array<string, mixed>|list<int> $p1Tree */
        $p1Tree = $validated['p1_tree'] ?? (is_array($validated['p1'] ?? null) ? $validated['p1'] : ['parent' => $validated['p1'] ?? null]);

        /** @var array<string, mixed>|list<int> $p2Tree */
        $p2Tree = $validated['p2_tree'] ?? (is_array($validated['p2'] ?? null) ? $validated['p2'] : ['parent' => $validated['p2'] ?? null]);

        /** @var list<int>|array<string, mixed> $sharedG1Races */
        $sharedG1Races = $validated['shared_g1_races'] ?? [];
        $pointsPerRace = (int) ($validated['points_per_race'] ?? 3);
        $method = (string) ($validated['method'] ?? 'pairwise');

        $result = $this->affinityService->calculatePedigreeAffinity(
            $targetId,
            $p1Tree,
            $p2Tree,
            $sharedG1Races,
            $pointsPerRace,
            $method
        );

        return response()->json($result);
    }

    /**
     * Get parent pair recommendations from the user's owned collection.
     */
    public function recommendations(Request $request, int|string $targetId): JsonResponse
    {
        $resolvedTargetId = is_numeric($targetId)
            ? (int) $targetId
            : ($this->affinityService->resolveCharId($targetId) ?? 0);

        if ($resolvedTargetId <= 0) {
            return response()->json([
                'message' => 'Karakter target tidak valid atau tidak ditemukan.',
                'target' => null,
                'owned_count' => 0,
                'recommendations' => [],
            ], 422);
        }

        $limit = min(20, max(1, (int) $request->query('limit', 5)));
        $result = $this->affinityService->findBestParents($resolvedTargetId, $limit);

        return response()->json($result);
    }

    /**
     * Get list of popular JP G1 races with category presets.
     */
    public function races(): JsonResponse
    {
        $categories = $this->affinityService->getG1Races();

        $flatList = [];
        foreach ($categories as $catKey => $catData) {
            foreach ($catData['races'] as $race) {
                $flatList[$race['id']] = array_merge($race, [
                    'category_key' => $catKey,
                    'category_name' => $catData['category_name'],
                ]);
            }
        }

        return response()->json([
            'categories' => $categories,
            'all_races' => array_values($flatList),
        ]);
    }

    /**
     * Get user career runs for synchronizing historical race wins.
     */
    public function careerRuns(Request $request): JsonResponse
    {
        $umaName = $request->query('uma_name');

        $query = CareerRun::query()
            ->latest('run_date')
            ->latest('id');

        if ($umaName) {
            $query->where('uma_name', 'like', "%{$umaName}%");
        }

        $runs = $query->limit(25)->get([
            'id',
            'uma_name',
            'scenario',
            'training_type',
            'evaluation_score',
            'final_rank',
            'run_date',
            'notes',
        ]);

        return response()->json([
            'runs' => $runs,
        ]);
    }
}
