<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\CircleSnapshot;
use Exception;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CircleTrackerService
{
    public const BASE_URL = 'https://muxueuma.com';

    public const COOLDOWN_SECONDS = 10800; // 3 hours in seconds

    /**
     * Get Circle Tracker Status including latest snapshot and cooldown info.
     *
     * @return array<string, mixed>
     */
    public function getStatus(?string $circleId = null): array
    {
        $savedCircleId = (string) AppSetting::getValue('circle_id', '');
        if (empty($circleId) && empty($savedCircleId)) {
            return [
                'has_circle' => false,
                'has_data' => false,
                'circle_id' => null,
                'circle_name' => null,
                'member_count' => 0,
                'rank' => null,
                'point' => 0,
                'active_total' => 0,
                'period' => null,
                'members' => [],
                'trend_segments' => [],
                'tracked_player' => null,
                'last_refreshed_at' => null,
                'cooldown_seconds_remaining' => 0,
                'can_refresh' => true,
                'pace_estimator' => $this->calculatePaceEstimator(),
            ];
        }

        $circleId = $circleId ?: $savedCircleId;
        $trackedViewerId = (string) AppSetting::getValue('tracked_viewer_id', '886175385');

        $latest = CircleSnapshot::where('circle_id', $circleId)
            ->latest('last_refreshed_at')
            ->first();

        // If no snapshot exists yet, automatically perform initial fetch
        if (! $latest) {
            try {
                $latest = $this->fetchAndSave($circleId);
            } catch (Exception $e) {
                Log::error('Initial circle fetch failed: '.$e->getMessage());
            }
        }

        return $this->formatSnapshotResponse($latest, $circleId, $trackedViewerId);
    }

    /**
     * Save circle ID and perform initial fetch from Muxueuma.
     *
     * @return array<string, mixed>
     */
    public function setCircle(string $circleId): array
    {
        $circleId = trim($circleId);
        if ($circleId === '') {
            return [
                'success' => false,
                'message' => 'ID Circle Club tidak boleh kosong.',
            ];
        }

        AppSetting::setValue('circle_id', $circleId);

        // Fetch fresh data for this circle (force = true)
        return $this->refresh($circleId, true);
    }

    /**
     * Clear the currently active circle ID.
     *
     * @return array<string, mixed>
     */
    public function clearCircle(): array
    {
        AppSetting::setValue('circle_id', '');

        return [
            'success' => true,
            'message' => 'Circle ID berhasil direset. Silakan masukkan ID Club baru.',
            'data' => [
                'has_circle' => false,
                'has_data' => false,
                'circle_id' => null,
            ],
        ];
    }

    /**
     * Refresh data from muxueuma.com with strict 3-hour cooldown enforcement.
     *
     * @return array{success: bool, message?: string, data?: array<string, mixed>}
     */
    public function refresh(?string $circleId = null, bool $force = false): array
    {
        $circleId = $circleId ?: (string) AppSetting::getValue('circle_id', '441730573');
        $trackedViewerId = (string) AppSetting::getValue('tracked_viewer_id', '886175385');

        $latest = CircleSnapshot::where('circle_id', $circleId)
            ->latest('last_refreshed_at')
            ->first();

        if ($latest && ! $force) {
            $lastRefreshed = Carbon::parse($latest->last_refreshed_at);
            $secondsElapsed = (int) $lastRefreshed->diffInSeconds(now());

            if ($secondsElapsed < self::COOLDOWN_SECONDS) {
                $secondsRemaining = self::COOLDOWN_SECONDS - $secondsElapsed;
                $hours = floor($secondsRemaining / 3600);
                $minutes = ceil(($secondsRemaining % 3600) / 60);

                $timeLeft = $hours > 0
                    ? "{$hours} jam {$minutes} menit"
                    : "{$minutes} menit";

                return [
                    'success' => false,
                    'message' => "Tombol refresh data hanya dapat ditekan per 3 jam sekali sebelum tombolnya dapat ditekan kembali. Silakan coba lagi dalam {$timeLeft}.",
                    'data' => $this->formatSnapshotResponse($latest, $circleId, $trackedViewerId),
                ];
            }
        }

        try {
            $newSnapshot = $this->fetchAndSave($circleId);

            return [
                'success' => true,
                'message' => 'Data Fans Club berhasil diperbarui dari muxueuma.com!',
                'data' => $this->formatSnapshotResponse($newSnapshot, $circleId, $trackedViewerId),
            ];
        } catch (Exception $e) {
            Log::error('Muxueuma refresh error: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Gagal menghubungi server muxueuma.com: '.$e->getMessage(),
                'data' => $this->formatSnapshotResponse($latest, $circleId, $trackedViewerId),
            ];
        }
    }

    /**
     * Fetch from muxueuma endpoints and save a new CircleSnapshot record.
     */
    public function fetchAndSave(string $circleId): CircleSnapshot
    {
        $headers = [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
            'Accept' => 'application/json, text/plain, */*',
            'Referer' => self::BASE_URL.'/ja/',
            'Accept-Language' => 'ja,en-US;q=0.8,en;q=0.7',
        ];

        // 1. Fetch contributions
        $contribUrl = self::BASE_URL."/api/circles/{$circleId}/contributions";
        $contribRes = Http::withoutVerifying()->withHeaders($headers)->timeout(25)->get($contribUrl);

        if (! $contribRes->successful()) {
            throw new Exception("HTTP {$contribRes->status()} from {$contribUrl}");
        }

        $contributions = $contribRes->json();

        // 2. Fetch ranking trend
        $trendUrl = self::BASE_URL."/api/circles/{$circleId}/ranking-trend?range=7d";
        $trendRes = Http::withoutVerifying()->withHeaders($headers)->timeout(25)->get($trendUrl);

        if (! $trendRes->successful()) {
            throw new Exception("HTTP {$trendRes->status()} from {$trendUrl}");
        }

        $trend = $trendRes->json();

        $circle = $contributions['circle'] ?? [];
        $current = $trend['current'] ?? [];

        return CircleSnapshot::create([
            'circle_id' => (string) ($circle['id'] ?? $circleId),
            'circle_name' => (string) ($circle['name'] ?? 'Circle '.$circleId),
            'rank' => isset($current['rank']) ? (int) $current['rank'] : null,
            'point' => isset($current['point']) ? (int) $current['point'] : null,
            'member_count' => isset($circle['memberCount']) ? (int) $circle['memberCount'] : null,
            'active_total' => isset($contributions['activeTotal']) ? (int) $contributions['activeTotal'] : null,
            'period' => (string) ($contributions['period'] ?? $current['period'] ?? date('Y-m-01')),
            'payload' => [
                'contributions' => $contributions,
                'trend' => $trend,
            ],
            'last_refreshed_at' => now(),
        ]);
    }

    /**
     * Format snapshot and payload for JSON API response.
     *
     * @return array<string, mixed>
     */
    protected function formatSnapshotResponse(?CircleSnapshot $snapshot, string $circleId, string $trackedViewerId): array
    {
        if (! $snapshot) {
            return [
                'has_circle' => true,
                'circle_id' => $circleId,
                'has_data' => false,
                'can_refresh' => true,
                'cooldown_seconds_remaining' => 0,
                'next_refresh_at' => null,
                'last_refreshed_at' => null,
                'pace_estimator' => $this->calculatePaceEstimator(),
            ];
        }

        $payload = $snapshot->payload ?? [];
        $contributions = $payload['contributions'] ?? [];
        $trend = $payload['trend'] ?? [];
        $rows = $contributions['rows'] ?? [];

        // Find tracked player
        $trackedPlayer = null;
        foreach ($rows as $row) {
            if (isset($row['viewerId']) && (string) $row['viewerId'] === $trackedViewerId) {
                $trackedPlayer = $row;
                break;
            }
        }

        $lastRefreshed = Carbon::parse($snapshot->last_refreshed_at);
        $secondsElapsed = (int) $lastRefreshed->diffInSeconds(now());
        $secondsRemaining = max(0, self::COOLDOWN_SECONDS - $secondsElapsed);
        $canRefresh = $secondsRemaining === 0;
        $nextRefreshAt = $lastRefreshed->copy()->addSeconds(self::COOLDOWN_SECONDS)->toIso8601String();

        return [
            'has_circle' => true,
            'has_data' => true,
            'circle_id' => $snapshot->circle_id,
            'circle_name' => $snapshot->circle_name,
            'rank' => $snapshot->rank,
            'point' => $snapshot->point,
            'member_count' => $snapshot->member_count,
            'active_total' => $snapshot->active_total,
            'period' => $snapshot->period,
            'business_date' => $contributions['businessDate'] ?? null,
            'last_month' => $trend['lastMonth'] ?? null,
            'tracked_viewer_id' => $trackedViewerId,
            'tracked_player' => $trackedPlayer,
            'members' => $rows,
            'trend_segments' => $trend['segments'] ?? [],
            'last_refreshed_at' => $snapshot->last_refreshed_at->toIso8601String(),
            'next_refresh_at' => $nextRefreshAt,
            'cooldown_seconds_remaining' => $secondsRemaining,
            'can_refresh' => $canRefresh,
            'pace_estimator' => $this->calculatePaceEstimator(),
        ];
    }

    /**
     * Calculate Daily Circle Pace & Run Estimator.
     *
     * @return array<string, mixed>
     */
    public function calculatePaceEstimator(?int $customTarget = null): array
    {
        $now = Carbon::now();
        $target = $customTarget ?: (int) AppSetting::getValue('monthly_circle_target', AppSetting::getValue('circle_goal', 30000000));
        if ($target <= 0) {
            $target = 30000000;
        }

        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();

        // Fans collected this month from career runs
        $careerFansThisMonth = (int) CareerRun::whereBetween('run_date', [$startOfMonth, $endOfMonth])->sum('fans_gained');

        // Check if there is also tracked member contribution from circle snapshot in the current month
        $trackedContribution = 0;
        $savedCircleId = (string) AppSetting::getValue('circle_id', '');
        if (! empty($savedCircleId)) {
            $latestSnapshot = CircleSnapshot::where('circle_id', $savedCircleId)->latest('last_refreshed_at')->first();
            if ($latestSnapshot && ! empty($latestSnapshot->payload['contributions']['rows'])) {
                $trackedViewerId = (string) AppSetting::getValue('tracked_viewer_id', '886175385');
                foreach ($latestSnapshot->payload['contributions']['rows'] as $row) {
                    if (isset($row['viewerId']) && (string) $row['viewerId'] === $trackedViewerId) {
                        $trackedContribution = (int) ($row['contribution'] ?? 0);
                        break;
                    }
                }
            }
        }

        // Use maximum of career runs fans this month or tracked player contribution
        $currentFans = max($careerFansThisMonth, $trackedContribution);

        $daysInMonth = (int) $now->daysInMonth;
        $dayOfMonth = (int) $now->day;
        $daysRemaining = max(1, $daysInMonth - $dayOfMonth + 1);

        $remainingFans = max(0, $target - $currentFans);
        $requiredDailyPace = (int) round($remainingFans / $daysRemaining);
        $currentDailyPace = (int) round($currentFans / max(1, $dayOfMonth));

        // Average fans gained from CareerRun in the last 30 days (default fallback: 450,000)
        $avgPastFans = CareerRun::where('run_date', '>=', $now->copy()->subDays(30)->toDateString())->avg('fans_gained');
        $avgFansPerRun = (int) round($avgPastFans ?: 450000);
        if ($avgFansPerRun <= 0) {
            $avgFansPerRun = 450000;
        }

        $estimatedRunsPerDay = (int) ceil($requiredDailyPace / $avgFansPerRun);

        // Determine pace status
        if ($remainingFans === 0 || $currentDailyPace >= $requiredDailyPace) {
            $status = 'Ahead of Pace';
        } elseif ($currentDailyPace >= (int) round($requiredDailyPace * 0.85)) {
            $status = 'On Track';
        } else {
            $status = 'Behind Schedule';
        }

        $progressPercentage = $target > 0 ? min(100.0, round(($currentFans / $target) * 100, 1)) : 100.0;

        return [
            'monthly_circle_target' => $target,
            'current_fans' => $currentFans,
            'career_fans_this_month' => $careerFansThisMonth,
            'tracked_circle_fans' => $trackedContribution,
            'remaining_fans' => $remainingFans,
            'days_in_month' => $daysInMonth,
            'current_day' => $dayOfMonth,
            'days_remaining' => $daysRemaining,
            'required_daily_pace' => $requiredDailyPace,
            'current_daily_pace' => $currentDailyPace,
            'avg_fans_per_run' => $avgFansPerRun,
            'estimated_runs_per_day' => $estimatedRunsPerDay,
            'status' => $status,
            'progress_percentage' => $progressPercentage,
            'is_target_reached' => $remainingFans === 0,
        ];
    }
}
