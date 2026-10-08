<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompetitionEvent;
use App\Support\CompetitionRacetrackHelper;
use Illuminate\Http\JsonResponse;

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

        return response()->json([
            'success' => true,
            'data' => $events,
        ]);
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
