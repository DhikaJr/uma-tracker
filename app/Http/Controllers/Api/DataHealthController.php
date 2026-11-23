<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SyncRunResource;
use App\Models\SyncRun;
use App\Services\DataHealthService;
use Closure;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Throwable;

final class DataHealthController extends Controller
{
    private const HEADERS = ['Cache-Control' => 'no-store'];

    public function index(DataHealthService $health): JsonResponse
    {
        return $this->read(fn (): array => ['success' => true, 'health' => $health->snapshot()]);
    }

    public function syncRuns(Request $request): JsonResponse
    {
        $validator = Validator::make(
            $request->query(),
            ['limit' => ['bail', 'sometimes', 'required', 'integer', 'between:1,50']],
            ['limit.*' => 'Parameter limit harus berupa bilangan bulat antara 1 dan 50.'],
        );
        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first('limit'),
                'errors' => $validator->errors()->toArray(),
            ], 422, self::HEADERS);
        }

        $limit = (int) ($validator->validated()['limit'] ?? 20);

        return $this->read(function () use ($limit, $request): array {
            $runs = SyncRun::whereNull('parent_id')
                ->latestFirst()
                ->with(['children' => fn (HasMany $children) => $children->orderBy('started_at')->orderBy('id')])
                ->limit($limit)
                ->get();

            return [
                'success' => true,
                'runs' => SyncRunResource::collection($runs)->resolve($request),
                'meta' => ['limit' => $limit, 'returned' => $runs->count()],
            ];
        });
    }

    /** @param  Closure(): array<string, mixed>  $payload */
    private function read(Closure $payload): JsonResponse
    {
        try {
            return response()->json($payload(), headers: self::HEADERS);
        } catch (Throwable $error) {
            report($error);

            return response()->json(['success' => false, 'message' => 'Data kesehatan tidak dapat dibaca.'], 500, self::HEADERS);
        }
    }
}
