<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\CircleTrackerService;
use Closure;
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
        $input = $request->validate([
            'circle_id' => ['nullable', self::circleIdRule()],
            'period' => ['nullable', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])(-01)?$/D'],
        ]);
        $data = $this->trackerService->getStatus(
            isset($input['circle_id']) ? (string) $input['circle_id'] : null,
            $input['period'] ?? null,
        );

        return response()->json($data);
    }

    /**
     * Refresh Circle data with 1-hour cooldown enforcement.
     */
    public function refresh(Request $request): JsonResponse
    {
        $input = $request->validate(['circle_id' => ['nullable', self::circleIdRule()]]);
        $circleId = isset($input['circle_id']) ? (string) $input['circle_id'] : null;
        $force = $request->boolean('force');

        return $this->refreshResponse($this->trackerService->refresh($circleId, $force));
    }

    /**
     * Update the tracked player viewer ID.
     */
    public function trackPlayer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'viewer_id' => 'required|string|max:50',
            'circle_id' => ['nullable', self::circleIdRule()],
            'period' => ['nullable', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])(-01)?$/D'],
        ]);

        AppSetting::setValue('tracked_viewer_id', $validated['viewer_id']);

        $data = $this->trackerService->getStatus(
            isset($validated['circle_id']) ? (string) $validated['circle_id'] : null,
            $validated['period'] ?? null,
        );

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
            'circle_id' => ['required', self::circleIdRule()],
        ]);

        return $this->refreshResponse($this->trackerService->setCircle((string) $validated['circle_id']));
    }

    public static function circleIdRule(): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail): void {
            if ((! is_string($value) && ! is_int($value)) || strlen((string) $value) > 512
                || CircleTrackerService::extractCircleId((string) $value) === null) {
                $fail('Masukkan ID atau URL profil Circle MuxueUma yang valid.');
            }
        };
    }

    private function refreshResponse(array $result): JsonResponse
    {
        return response()->json($result, match ($result['error'] ?? null) {
            'cooldown' => 429,
            'invalid_circle_id' => 422,
            'not_found' => 404,
            'response_mismatch', 'upstream_failure' => 502,
            default => 200,
        });
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
