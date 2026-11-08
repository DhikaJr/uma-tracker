<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompetitionEvent;
use App\Services\CompetitionSyncService;
use App\Support\CompetitionRacetrackHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class CompetitionEventController extends Controller
{
    /**
     * Display a listing of upcoming competition events ordered chronologically.
     * Preserves NULL values and explicit "random" values without speculation.
     * Attaches official GameTora racetrack course details when conditions are confirmed.
     */
    public function index(): JsonResponse
    {
        $events = CompetitionEvent::chronological()->get()->map(function (CompetitionEvent $event) {
            $data = $event->toArray();
            $data['racetrack_course'] = CompetitionRacetrackHelper::findCourse($event);

            return $data;
        });

        $liveSyncData = CompetitionSyncService::getLiveSyncData();

        return response()->json([
            'success' => true,
            'sync_meta' => [
                'last_synced_at' => $liveSyncData['last_synced_at'],
                'status' => $liveSyncData['status'],
            ],
            'data' => $events,
        ]);
    }

    /**
     * Synchronize upcoming competition events and guide recommendations
     * from official Cygames JP news and GameWith JP build guides.
     */
    public function sync(Request $request, CompetitionSyncService $syncService): JsonResponse
    {
        try {
            $force = $request->boolean('force', false);
            $result = $syncService->syncAll($force);

            return response()->json($result);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyinkronkan data kompetisi: '.$e->getMessage(),
                'last_synced_at' => null,
                'updated_events' => [],
                'events_checked' => 0,
                'data' => [],
            ], 500);
        }
    }

    /**
     * Display the specified competition event.
     */
    public function show(int $id): JsonResponse
    {
        $event = CompetitionEvent::findOrFail($id);
        $data = $event->toArray();
        $data['racetrack_course'] = CompetitionRacetrackHelper::findCourse($event);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
