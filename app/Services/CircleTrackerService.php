<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AppSetting;
use App\Models\CareerRun;
use App\Models\CircleSnapshot;
use App\Support\VerifiedHttp;
use Exception;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class CircleTrackerService
{
    public const BASE_URL = 'https://muxueuma.com';

    public const COOLDOWN_SECONDS = 3600; // 1 hour in seconds

    // Circle periods follow the Japanese calendar and roll over at midnight JST.
    private const BUSINESS_TIMEZONE = 'Asia/Tokyo';

    public static function extractCircleId(string $input): ?string
    {
        if (preg_match('/^[0-9]{1,20}$/D', trim($input))) {
            return trim($input);
        }

        if (preg_match('~^(?:https://muxueuma\.com)?/(?:[a-z]{2}(?:-[a-z]{2})?/)?circles/([0-9]{1,20})/?(?:\?[^#\s]*)?(?:#[^\s]*)?$~iD', trim($input), $matches)) {
            return $matches[1];
        }

        return null;
    }

    public static function normalizePeriod(mixed $period): ?string
    {
        return is_string($period) && preg_match('/^(\d{4}-(?:0[1-9]|1[0-2]))(?:-01)?$/D', trim($period), $matches)
            ? $matches[1]
            : null;
    }

    private function latestSnapshot(string $circleId, string $period): ?CircleSnapshot
    {
        return CircleSnapshot::where('circle_id', $circleId)
            ->whereIn('period', [$period, "{$period}-01"])
            ->latest('last_refreshed_at')
            ->orderByDesc('id')
            ->first();
    }

    private function activeCircleId(): ?string
    {
        return self::extractCircleId((string) AppSetting::getValue('circle_id', ''));
    }

    /** @return array<string, mixed> */
    public function getStatus(?string $circleId = null, ?string $period = null): array
    {
        $circleId = $circleId === null ? $this->activeCircleId() : self::extractCircleId($circleId);
        $currentPeriod = Carbon::now(self::BUSINESS_TIMEZONE)->format('Y-m');
        $period = self::normalizePeriod($period) ?? $currentPeriod;
        $snapshot = $circleId === null ? null : $this->latestSnapshot($circleId, $period);
        $message = null;

        if ($circleId !== null && $snapshot === null) {
            try {
                $snapshot = $this->fetchSnapshot($circleId, $period, $period === $currentPeriod);
            } catch (Exception $e) {
                $message = $this->describeFetchFailure($e, $period !== $currentPeriod);
                Log::warning("Gagal mengambil snapshot Circle untuk {$period}: {$message}");
            }
        }

        return $this->formatSnapshotResponse($snapshot, $circleId, $period, $currentPeriod, $message);
    }

    /** @return array<string, mixed> */
    public function setCircle(string $circleId): array
    {
        $result = $this->refresh($circleId, true);
        if (! $result['success']) {
            return $result;
        }

        AppSetting::setValue('circle_id', $result['data']['circle_id']);
        $result['data']['pace_estimator'] = $this->calculatePaceEstimator();

        return $result;
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

    /** @return array<string, mixed> */
    public function refresh(?string $circleId = null, bool $force = false): array
    {
        $circleId = $circleId === null ? $this->activeCircleId() : self::extractCircleId($circleId);
        if ($circleId === null) {
            return ['success' => false, 'error' => 'invalid_circle_id', 'message' => 'Masukkan ID atau URL profil Circle MuxueUma yang valid.'];
        }

        $period = Carbon::now(self::BUSINESS_TIMEZONE)->format('Y-m');
        $latest = $this->latestSnapshot($circleId, $period);
        if ($latest && ! $force && $this->cooldownRemaining($latest) > 0) {
            return [
                'success' => false,
                'error' => 'cooldown',
                'message' => 'Tombol refresh data hanya dapat ditekan per 1 jam sekali.',
                'data' => $this->formatSnapshotResponse($latest, $circleId, $period, $period),
            ];
        }

        try {
            $snapshot = $this->fetchSnapshot($circleId, $period, true);

            return [
                'success' => true,
                'message' => 'Data Circle berhasil diperbarui dari MuxueUma.',
                'data' => $this->formatSnapshotResponse($snapshot, $circleId, $period, $period),
            ];
        } catch (Exception $e) {
            $message = $this->describeFetchFailure($e);
            Log::warning("Gagal memperbarui Circle: {$message}");

            return [
                'success' => false,
                'error' => match ($e->getCode()) {
                    404 => 'not_found',
                    409 => 'response_mismatch',
                    default => 'upstream_failure',
                },
                'message' => $message,
                'data' => $this->formatSnapshotResponse($latest, $circleId, $period, $period, $message),
            ];
        }
    }

    private function describeFetchFailure(Exception $e, bool $archive = false): string
    {
        return match ($e->getCode()) {
            404 => $archive ? 'Arsip Circle untuk bulan tersebut belum tersedia.' : 'Profil Circle tidak ditemukan di MuxueUma.',
            409 => $e->getMessage(),
            default => 'Gagal menghubungi MuxueUma: '.VerifiedHttp::errorMessage($e),
        };
    }

    private function cooldownRemaining(CircleSnapshot $snapshot): int
    {
        $secondsElapsed = now()->getTimestamp() - $snapshot->last_refreshed_at->getTimestamp();

        return max(0, self::COOLDOWN_SECONDS - max(0, $secondsElapsed));
    }

    private function fetchSnapshot(string $circleId, string $period, bool $isCurrent): CircleSnapshot
    {
        $headers = [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
            'Accept' => 'application/json, text/plain, */*',
            'Referer' => self::BASE_URL.'/ja/',
            'Accept-Language' => 'ja,en-US;q=0.8,en;q=0.7',
        ];
        $client = fn () => VerifiedHttp::request()->withHeaders($headers)->timeout(25)->withoutRedirecting();
        $base = self::BASE_URL."/api/circles/{$circleId}";
        $response = $client()->get($base.'/contributions', $isCurrent ? [] : ['period' => $period]);
        if (! $response->successful()) {
            throw new Exception("HTTP {$response->status()} dari endpoint kontribusi.", $response->status());
        }

        $contributions = $response->json();
        $circle = $contributions['circle'] ?? [];
        if ((string) ($circle['id'] ?? '') !== $circleId) {
            throw new Exception('ID Circle pada respons MuxueUma berbeda dari ID yang diminta.', 409);
        }
        if (self::normalizePeriod($contributions['period'] ?? null) !== $period) {
            throw new Exception('Periode kontribusi pada respons MuxueUma berbeda dari periode yang diminta.', 409);
        }

        try {
            $response = $client()->get($base.'/ranking-trend', ['range' => $isCurrent ? '7d' : '30d']);
            if (! $response->successful()) {
                throw new Exception("HTTP {$response->status()} dari endpoint ranking.");
            }
            $trend = $response->json();
            if (! is_array($trend)) {
                throw new Exception('Respons ranking MuxueUma tidak valid.');
            }
        } catch (Exception $e) {
            if ($isCurrent) {
                throw $e;
            }
            Log::warning('Ranking arsip Circle tidak tersedia: '.VerifiedHttp::errorMessage($e));
            $trend = [];
        }
        $ranking = $trend[$isCurrent ? 'current' : 'lastMonth'] ?? [];
        $rankingPeriod = self::normalizePeriod($ranking['period'] ?? null);
        if ($isCurrent && $ranking !== [] && $rankingPeriod !== $period) {
            throw new Exception('Periode ranking pada respons MuxueUma berbeda dari periode yang diminta.', 409);
        }

        return CircleSnapshot::create([
            'circle_id' => $circleId,
            'circle_name' => (string) ($circle['name'] ?? 'Circle '.$circleId),
            'rank' => $rankingPeriod === $period && isset($ranking['rank']) ? (int) $ranking['rank'] : null,
            'point' => $rankingPeriod === $period && isset($ranking['point']) ? (int) $ranking['point'] : null,
            'member_count' => isset($circle['memberCount']) ? (int) $circle['memberCount'] : null,
            'active_total' => isset($contributions['activeTotal']) ? (int) $contributions['activeTotal'] : null,
            'period' => "{$period}-01",
            'payload' => ['contributions' => $contributions, 'trend' => $trend],
            'last_refreshed_at' => now(),
        ]);
    }

    /**
     * Format snapshot and payload for JSON API response.
     *
     * @return array<string, mixed>
     */
    protected function formatSnapshotResponse(?CircleSnapshot $snapshot, ?string $circleId, string $period, string $currentPeriod, ?string $message = null): array
    {
        $isCurrent = $period === $currentPeriod;
        $contributions = $snapshot?->payload['contributions'] ?? [];
        $trend = $snapshot?->payload['trend'] ?? [];
        $rows = $contributions['rows'] ?? [];
        $trackedViewerId = (string) AppSetting::getValue('tracked_viewer_id', '886175385');
        $trackedPlayer = collect($rows)->first(fn ($row) => (string) ($row['viewerId'] ?? '') === $trackedViewerId);

        $dbPeriods = $circleId === null ? [] : CircleSnapshot::where('circle_id', $circleId)->distinct()->pluck('period')->all();
        $availablePeriods = array_filter(array_map(self::normalizePeriod(...), [
            ...($contributions['availablePeriods'] ?? []), ...$dbPeriods, $period, $currentPeriod,
        ]));
        $availablePeriods = array_values(array_unique($availablePeriods));
        rsort($availablePeriods);
        $secondsRemaining = $isCurrent && $snapshot ? $this->cooldownRemaining($snapshot) : 0;

        $filteredSegments = [];
        foreach ($trend['segments'] ?? [] as $segment) {
            $segment['points'] = array_values(array_filter($segment['points'] ?? [], fn ($point) => str_starts_with((string) ($point['date'] ?? ''), $period.'-')
            ));
            if ($segment['points'] !== []) {
                $filteredSegments[] = $segment;
            }
        }

        // Older archive snapshots could have copied activeTotal into point.
        $lastMonth = $trend['lastMonth'] ?? [];
        $hasArchiveRanking = self::normalizePeriod($lastMonth['period'] ?? null) === $period;

        return [
            'has_circle' => $circleId !== null,
            'has_data' => $snapshot !== null,
            'message' => $message,
            'circle_id' => $circleId,
            'circle_name' => $snapshot?->circle_name,
            'rank' => $isCurrent ? $snapshot?->rank : ($hasArchiveRanking && isset($lastMonth['rank']) ? (int) $lastMonth['rank'] : null),
            'point' => $isCurrent ? $snapshot?->point : ($hasArchiveRanking && isset($lastMonth['point']) ? (int) $lastMonth['point'] : null),
            'member_count' => $snapshot?->member_count,
            'active_total' => $snapshot?->active_total,
            'period' => "{$period}-01",
            'current_period' => "{$currentPeriod}-01",
            'available_periods' => array_map(fn ($month) => "{$month}-01", $availablePeriods),
            'is_current_period' => $isCurrent,
            'selected_period' => "{$period}-01",
            'business_date' => $contributions['businessDate'] ?? null,
            'last_month' => $trend['lastMonth'] ?? null,
            'tracked_viewer_id' => $trackedViewerId,
            'tracked_player' => $trackedPlayer,
            'members' => $rows,
            'trend_segments' => $filteredSegments,
            'last_refreshed_at' => $snapshot?->last_refreshed_at->toIso8601String(),
            'next_refresh_at' => $isCurrent && $snapshot ? $snapshot->last_refreshed_at->copy()->addSeconds(self::COOLDOWN_SECONDS)->toIso8601String() : null,
            'cooldown_seconds_remaining' => $secondsRemaining,
            'can_refresh' => $isCurrent && $secondsRemaining === 0,
            'pace_estimator' => $isCurrent ? $this->calculatePaceEstimator() : null,
        ];
    }

    /**
     * Calculate Daily Circle Pace & Run Estimator.
     *
     * @return array<string, mixed>
     */
    public function calculatePaceEstimator(?int $customTarget = null): array
    {
        $now = Carbon::now(self::BUSINESS_TIMEZONE);
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
        $savedCircleId = $this->activeCircleId();
        if (! empty($savedCircleId)) {
            $latestSnapshot = $this->latestSnapshot($savedCircleId, $now->format('Y-m'));
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
