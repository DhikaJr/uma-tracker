<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SyncRun;
use App\Services\CygamesNewsService;
use App\Services\GameToraSyncService;
use App\Services\SyncRunRecorder;
use Closure;
use Illuminate\Http\JsonResponse;
use Throwable;

final class DataHealthActionController extends Controller
{
    private const HEADERS = ['Cache-Control' => 'no-store'];

    public function recheckCygames(CygamesNewsService $service): JsonResponse
    {
        return $this->recheck(
            SyncRun::SOURCE_CYGAMES,
            'Pemeriksaan ulang Cygames selesai.',
            fn () => $service->syncSelectPickupBanners(false),
        );
    }

    public function recheckUmapyoi(GameToraSyncService $service): JsonResponse
    {
        return $this->recheck(
            SyncRun::SOURCE_UMAPYOI,
            'Pemeriksaan ulang Umapyoi selesai.',
            $service->recheckUmapyoiSource(...),
        );
    }

    private function recheck(string $source, string $message, Closure $action): JsonResponse
    {
        $runs = SyncRun::forSource($source)->where('trigger', SyncRun::TRIGGER_DIRECT)->whereNull('parent_id');
        $previousId = SyncRunRecorder::bestEffort(fn (): int => (int) (clone $runs)->max('id'));

        try {
            $action();
        } catch (Throwable $error) {
            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Pemeriksaan ulang sumber tidak dapat dijalankan.',
            ], 500, self::HEADERS);
        }

        $run = $previousId === null ? null : SyncRunRecorder::bestEffort(function () use ($runs, $previousId): ?SyncRun {
            $candidates = $runs->where('id', '>', $previousId)->limit(2)->get();
            $candidate = $candidates->count() === 1 ? $candidates->first() : null;

            return $candidate?->finished_at !== null ? $candidate : null;
        });

        return response()->json([
            'success' => true,
            'action' => 'recheck_'.$source,
            'message' => $message,
            'source' => $source,
            'source_status' => $run?->status ?? 'unknown',
            'run_id' => $run?->id,
        ], headers: self::HEADERS);
    }
}
