<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SyncRun;
use App\Support\VerifiedHttp;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Log;
use Throwable;

final class SyncRunRecorder
{
    private const METADATA_KEYS = [
        'force', 'allow_evolution_removals', 'mode', 'is_up_to_date', 'manifest_changed',
        'characters_processed', 'support_cards_processed', 'banners_processed',
        'index_fetch_ok', 'detail_fetch_failures', 'parse_failures', 'resolution_failures',
        'unmatched_articles', 'articles_processed', 'official_banners_updated',
        'search_request_ok', 'articles_seen', 'detail_requests', 'detail_failures', 'lineup_failures',
        'lineups_found',
    ];

    private int $childWarningCount = 0;

    private function __construct(private readonly ?SyncRun $run, private readonly ?self $parent) {}

    /**
     * @param  array<string, bool|int|string>  $metadata
     */
    public static function start(string $source, string $trigger, ?self $parent = null, array $metadata = []): self
    {
        $run = self::bestEffort(fn () => SyncRun::create([
            'parent_id' => $parent?->run?->getKey(),
            'source' => $source,
            'trigger' => $trigger,
            'status' => SyncRun::STATUS_SUCCESS,
            'started_at' => now(),
            'metadata' => self::safeMetadata($metadata),
        ]));

        return new self($run, $parent);
    }

    /**
     * @param  array<string, bool|int|string>  $metadata
     */
    public function finish(
        string $status,
        array $metadata = [],
        ?int $createdCount = null,
        ?int $updatedCount = null,
        int $unresolvedCount = 0,
        int $warningCount = 0,
        ?Throwable $error = null,
    ): void {
        if ($this->parent !== null && $status !== SyncRun::STATUS_SUCCESS) {
            $this->parent->childWarningCount++;
        }

        if (! $this->run?->exists) {
            return;
        }

        self::bestEffort(fn () => $this->run->update([
            'status' => $status,
            'finished_at' => now(),
            'created_count' => $createdCount,
            'updated_count' => $updatedCount,
            'unresolved_count' => $unresolvedCount,
            'warning_count' => $warningCount,
            'error_summary' => $status === SyncRun::STATUS_SUCCESS ? null : self::errorSummary($error, $status),
            'metadata' => self::safeMetadata(array_replace($this->run->metadata ?? [], $metadata)),
        ]));
    }

    public function childWarningCount(): int
    {
        return $this->childWarningCount;
    }

    /** Run an optional telemetry operation without affecting sync. */
    public static function bestEffort(Closure $operation): mixed
    {
        try {
            return $operation();
        } catch (Throwable) {
            try {
                Log::warning('Pencatatan telemetri sinkronisasi gagal.');
            } catch (Throwable) {
                // Logging is optional too.
            }

            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, bool|int|string>
     */
    private static function safeMetadata(array $metadata): array
    {
        return array_filter(
            array_intersect_key($metadata, array_flip(self::METADATA_KEYS)),
            static fn (mixed $value): bool => is_bool($value) || is_int($value) || in_array($value, ['full', 'cached'], true),
        );
    }

    private static function errorSummary(?Throwable $error, string $status): string
    {
        $message = $error?->getMessage() ?? '';
        if ($error && str_starts_with(VerifiedHttp::errorMessage($error), 'Verifikasi sertifikat TLS gagal.')) {
            return 'Verifikasi sertifikat TLS gagal.';
        }

        if (preg_match('/\bHTTP (\d{3})\b/', $message, $matches)) {
            return "Permintaan sumber gagal (HTTP {$matches[1]}).";
        }

        if (preg_match('/\bcURL error (\d{1,3})\b/i', $message, $matches)) {
            return "Koneksi ke sumber gagal (cURL {$matches[1]}).";
        }

        return match (true) {
            $message === 'Struktur manifest GameTora tidak valid.' => 'Struktur manifest GameTora tidak valid.',
            $error instanceof QueryException => 'Penyimpanan data sinkronisasi gagal.',
            $error instanceof ConnectionException => 'Koneksi ke sumber gagal.',
            $status === SyncRun::STATUS_DEGRADED => 'Sinkronisasi sumber selesai dengan gangguan.',
            default => 'Sinkronisasi sumber gagal.',
        };
    }
}
