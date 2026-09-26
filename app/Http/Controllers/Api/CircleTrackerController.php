<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\CircleTrackerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CircleTrackerController extends Controller
{
    public function __construct(
        public CircleTrackerService $trackerService
    ) {}

    /**
     * Get Circle Status, roster, and cooldown state.
     */
    public function status(Request $request): JsonResponse
    {
        $circleId = $request->query('circle_id');
        $data = $this->trackerService->getStatus($circleId ? (string) $circleId : null);

        return response()->json($data);
    }

    /**
     * Refresh Circle data with 3-hour cooldown enforcement.
     */
    public function refresh(Request $request): JsonResponse
    {
        $circleId = $request->input('circle_id');
        $force = (bool) $request->input('force', false);

        $result = $this->trackerService->refresh($circleId ? (string) $circleId : null, $force);

        if (! $result['success'] && str_contains($result['message'] ?? '', 'Tombol refresh data hanya dapat ditekan')) {
            return response()->json($result, 429);
        }

        return response()->json($result);
    }

    /**
     * Update the tracked player viewer ID.
     */
    public function trackPlayer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'viewer_id' => 'required|string|max:50',
        ]);

        AppSetting::setValue('tracked_viewer_id', $validated['viewer_id']);

        $circleId = $request->input('circle_id');
        $data = $this->trackerService->getStatus($circleId ? (string) $circleId : null);

        return response()->json([
            'success' => true,
            'message' => "Player ID {$validated['viewer_id']} sekarang disorot sebagai akun Anda!",
            'data' => $data,
        ]);
    }

    /**
     * Set Circle ID and fetch initial data.
     */
    public function setCircle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'circle_id' => 'required|string|max:50',
        ]);

        $result = $this->trackerService->setCircle($validated['circle_id']);

        if (! ($result['success'] ?? false)) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Clear current Circle ID.
     */
    public function clearCircle(): JsonResponse
    {
        $result = $this->trackerService->clearCircle();

        return response()->json($result);
    }

    /**
     * Get Daily Circle Pace & Run Estimator.
     */
    public function pace(Request $request): JsonResponse
    {
        $target = $request->has('target') ? (int) $request->input('target') : null;
        $data = $this->trackerService->calculatePaceEstimator($target);

        return response()->json($data);
    }
}
