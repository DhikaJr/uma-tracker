<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\SyncRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use stdClass;

final class SyncRunResource extends JsonResource
{
    private const METADATA_KEYS = [
        'mode', 'force', 'allow_evolution_removals', 'is_up_to_date', 'manifest_changed',
        'characters_processed', 'support_cards_processed', 'banners_processed',
        'index_fetch_ok', 'detail_fetch_failures', 'parse_failures', 'resolution_failures',
        'unmatched_articles', 'articles_processed', 'official_banners_updated',
        'search_request_ok', 'articles_seen', 'detail_requests', 'detail_failures', 'lineup_failures',
        'lineups_found', 'lineups_validated', 'lineups_validated_only',
    ];

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SyncRun $run */
        $run = $this->resource;

        return $this->fields($run) + [
            'children' => $run->getRelation('children')->map(fn (SyncRun $child): array => $this->fields($child))->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function fields(SyncRun $run): array
    {
        $isFinished = $run->finished_at !== null;

        return [
            'id' => $run->id,
            'parent_id' => $run->parent_id,
            'source' => $run->source,
            'trigger' => $run->trigger,
            'status' => $isFinished ? $run->status : null,
            'is_finished' => $isFinished,
            'started_at' => $run->started_at->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'created_count' => $run->created_count,
            'updated_count' => $run->updated_count,
            'unresolved_count' => $run->unresolved_count,
            'warning_count' => $run->warning_count,
            'error_summary' => $run->error_summary,
            'metadata' => $this->metadata($run),
        ];
    }

    private function metadata(SyncRun $run): stdClass
    {
        $metadata = [];
        $stored = $run->metadata;
        foreach (is_array($stored) ? array_intersect_key($stored, array_flip(self::METADATA_KEYS)) : [] as $key => $value) {
            $valid = match ($key) {
                'mode' => in_array($value, ['full', 'cached'], true),
                'force', 'allow_evolution_removals', 'is_up_to_date', 'manifest_changed', 'index_fetch_ok', 'search_request_ok' => is_bool($value),
                default => is_int($value),
            };
            if ($valid) {
                $metadata[$key] = $value;
            }
        }

        return (object) $metadata;
    }
}
