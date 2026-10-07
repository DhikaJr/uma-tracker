<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompetitionEvent;
use Illuminate\Http\JsonResponse;

class CompetitionEventController extends Controller
{
    /**
     * Display a listing of upcoming competition events ordered chronologically.
     * Preserves NULL values and explicit "random" values without speculation.
     */
    public function index(): JsonResponse
    {
        $events = CompetitionEvent::chronological()->get();

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

        return response()->json([
            'success' => true,
            'data' => $event,
        ]);
    }
}
