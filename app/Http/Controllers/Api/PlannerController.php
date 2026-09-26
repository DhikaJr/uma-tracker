<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PlannerController extends Controller
{
    /**
     * Default JP Server Planner settings.
     *
     * @return array<string, mixed>
     */
    public static function getDefaultConfig(): array
    {
        return [
            'free_carats' => 15000,
            'paid_carats' => 0,
            'character_tickets' => 5,       // Tiket Gacha Karakter
            'support_tickets' => 5,         // Tiket Gacha Support Card
            'single_tickets' => 5,          // Kompatibilitas mundur
            'ten_tickets' => 0,             // Kompatibilitas mundur
            'target_banner_type' => 'character', // 'character' | 'support' | 'all'
            'target_date' => Carbon::now()->addDays(30)->format('Y-m-d'),
            'spark_goal_multiplier' => 1.0, // 0.5 (100 pulls), 1.0 (200 pulls), 2.0 (400 pulls)
            'include_predictions' => true,  // true: hitung spark dengan prediksi, false: hanya aset saat ini
            'f2p_daily_missions' => true,   // 30 carats/day
            'f2p_login_bonus' => true,      // 110 carats / 8 days (~13.75 carats/day)
            'f2p_training_pass' => true,    // Free Training Pass: 500 carats/month
            'stadium_class' => 6,           // Class 6: 250/wk, Class 5: 200/wk, Class 4: 150/wk, Class 3: 100/wk, Class 2: 70/wk, Class 1: 50/wk
            'circle_rank' => 'A',           // SS: 3000, S+: 2400, S: 2100, A+: 1800, A: 1500, B+: 1200, B: 900, C+: 600, C: 300, D+: 150, Unranked: 0
            'champions_meeting_target' => 'final_a_2', // 'final_a_1', 'final_a_2', 'final_a_3', 'final_b_1', 'final_b_2', 'final_b_3', 'loh_*', 'none'
            'shop_friendship_enabled' => true,      // Friendship Point Shop: 1 Tiket Karakter + 1 Tiket Support / bulan (20.000 FP per tiket)
            'shop_horseshoe_silver' => true,        // Silver Horseshoe: 2 Tiket Karakter + 2 Tiket Support / bulan
            'shop_horseshoe_gold' => true,          // Gold Horseshoe: 2 Tiket Karakter + 2 Tiket Support / bulan
            'shop_horseshoe_rainbow' => false,      // Rainbow Horseshoe: 2 Tiket Karakter + 2 Tiket Support / bulan (opsional, butuh buang SSR)
            'story_events_count' => 1,      // 1000 carats each
            'legend_races_count' => 1,      // 150 carats each (1 boss first-clear)
            'g1_bonus_enabled' => false,    // Musiman (~300 carats/bulan saat aktif)
            'pakalive_streams_count' => 1,  // 1500 carats each
            'daily_jewel_pack' => false,    // 500 paid carats + 50 free/day
            'trainer_pass' => false,        // Premium Training Pass: 1700 carats (350 paid + 1350 free) + 4 tickets/month (2 Karakter + 2 Support)
        ];
    }

    /**
     * Get the saved Jewel Planner configuration or defaults.
     */
    public function getConfig(): JsonResponse
    {
        $raw = AppSetting::getValue('jewel_planner_config');
        $config = self::getDefaultConfig();

        if (is_string($raw) && ! empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $config = array_merge($config, $decoded);
            }
        }

        return response()->json([
            'success' => true,
            'config' => $config,
        ]);
    }

    /**
     * Save the Jewel Planner configuration to database.
     */
    public function saveConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'free_carats' => 'required|integer|min:0|max:10000000',
            'paid_carats' => 'nullable|integer|min:0|max:10000000',
            'character_tickets' => 'nullable|integer|min:0|max:10000',
            'support_tickets' => 'nullable|integer|min:0|max:10000',
            'single_tickets' => 'nullable|integer|min:0|max:10000',
            'ten_tickets' => 'nullable|integer|min:0|max:1000',
            'target_banner_type' => 'nullable|string|in:character,support,all',
            'target_date' => 'required|date',
            'spark_goal_multiplier' => 'required|numeric|min:0.1|max:10',
            'include_predictions' => 'nullable|boolean',
            'f2p_daily_missions' => 'nullable|boolean',
            'f2p_login_bonus' => 'nullable|boolean',
            'f2p_training_pass' => 'nullable|boolean',
            'stadium_class' => 'nullable|integer|min:0|max:6',
            'circle_rank' => 'nullable|string|max:10',
            'champions_meeting_target' => 'nullable|string|max:30',
            'shop_friendship_enabled' => 'nullable|boolean',
            'shop_horseshoe_silver' => 'nullable|boolean',
            'shop_horseshoe_gold' => 'nullable|boolean',
            'shop_horseshoe_rainbow' => 'nullable|boolean',
            'story_events_count' => 'nullable|integer|min:0|max:10',
            'masters_challenges_count' => 'nullable|integer|min:0|max:10',
            'legend_races_count' => 'nullable|integer|min:0|max:10',
            'g1_bonus_enabled' => 'nullable|boolean',
            'pakalive_streams_count' => 'nullable|integer|min:0|max:10',
            'daily_jewel_pack' => 'nullable|boolean',
            'trainer_pass' => 'nullable|boolean',
        ]);

        $defaultConfig = self::getDefaultConfig();
        $merged = array_merge($defaultConfig, $validated);

        AppSetting::setValue('jewel_planner_config', json_encode($merged, JSON_UNESCAPED_UNICODE));

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi Jewel & Spark Planner berhasil disimpan.',
            'config' => $merged,
        ]);
    }
}
