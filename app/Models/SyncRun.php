<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SyncRunFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SyncRun extends Model
{
    /** @use HasFactory<SyncRunFactory> */
    use HasFactory;

    public const SOURCE_GAMETORA = 'gametora';

    public const SOURCE_CYGAMES = 'cygames';

    public const SOURCE_UMAPYOI = 'umapyoi';

    public const TRIGGER_MANUAL = 'manual';

    public const TRIGGER_EMBEDDED = 'embedded';

    public const TRIGGER_DIRECT = 'direct';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_DEGRADED = 'degraded';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'parent_id', 'source', 'trigger', 'status', 'started_at', 'finished_at',
        'created_count', 'updated_count', 'unresolved_count', 'warning_count', 'error_summary', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'created_count' => 'integer',
            'updated_count' => 'integer',
            'unresolved_count' => 'integer',
            'warning_count' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function scopeForSource(Builder $query, string $source): Builder
    {
        return $query->where('source', $source);
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('started_at')->orderByDesc('id');
    }

    public function scopeFinished(Builder $query): Builder
    {
        return $query->whereNotNull('finished_at');
    }
}
