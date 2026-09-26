<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCharacter extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uma_catalog_item_id',
        'name',
        'base_stars',
        'current_stars',
        'is_owned',
        'obtained_at',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'base_stars' => 'integer',
        'current_stars' => 'integer',
        'is_owned' => 'boolean',
        'obtained_at' => 'date:Y-m-d',
    ];

    /**
     * Linked catalog item if available.
     *
     * @return BelongsTo<UmaCatalogItem, $this>
     */
    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(UmaCatalogItem::class, 'uma_catalog_item_id');
    }
}
