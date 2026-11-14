<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\CircleTrackerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get all app settings.
     */
    public function index(): JsonResponse
    {
        $settings = AppSetting::getAll();

        return response()->json([
            'circle_goal' => isset($settings['circle_goal']) ? (int) $settings['circle_goal'] : 20000000,
            'monthly_circle_target' => isset($settings['monthly_circle_target']) ? (int) $settings['monthly_circle_target'] : (isset($settings['circle_goal']) ? (int) $settings['circle_goal'] : 30000000),
            'circle_id' => $settings['circle_id'] ?? '441730573',
            'tracked_viewer_id' => $settings['tracked_viewer_id'] ?? '886175385',
        ]);
    }

    /**
     * Update settings.
     */
    public function update(Request $request, CircleTrackerService $tracker): JsonResponse
    {
        $validated = $request->validate([
            'circle_goal' => 'nullable|integer|min:10000|max:1000000000',
            'monthly_circle_target' => 'nullable|integer|min:10000|max:1000000000',
            'circle_id' => ['nullable', CircleTrackerController::circleIdRule()],
            'tracked_viewer_id' => 'nullable|string|max:50',
        ]);

        if (isset($validated['circle_id'])) {
            $result = $tracker->setCircle((string) $validated['circle_id']);
            if (! $result['success']) {
                return response()->json($result, $result['error'] === 'not_found' ? 404 : 502);
            }
            unset($validated['circle_id']);
        }

        foreach ($validated as $key => $value) {
            if ($value !== null) {
                AppSetting::setValue($key, (string) $value);
            }
        }

        return $this->index();
    }
}
