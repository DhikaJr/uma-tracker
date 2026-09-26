<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
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
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'circle_goal' => 'nullable|integer|min:10000|max:1000000000',
            'monthly_circle_target' => 'nullable|integer|min:10000|max:1000000000',
            'circle_id' => 'nullable|string|max:50',
            'tracked_viewer_id' => 'nullable|string|max:50',
        ]);

        foreach ($validated as $key => $value) {
            if ($value !== null) {
                AppSetting::setValue($key, (string) $value);
            }
        }

        return $this->index();
    }
}
