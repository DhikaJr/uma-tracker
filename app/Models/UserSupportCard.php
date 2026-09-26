<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSupportCard extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uma_catalog_item_id',
        'name',
        'char_name',
        'rarity',
        'card_type',
        'limit_break',
        'is_owned',
        'obtained_at',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'limit_break' => 'integer',
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
