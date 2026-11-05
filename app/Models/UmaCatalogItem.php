<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class UmaCatalogItem extends Model
{
    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('exclude_phantom_character_duplicates', function (Builder $builder) {
            $builder->where(function (Builder $query) {
                $query->where('name', '!=', 'Air Groove')
                    ->orWhere('type', '!=', 'character');
            });
        });
    }

    /**
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'name',
        'rarity',
        'gametora_id',
        'raw_data',
        'aptitudes',
        'skills',
        'objectives',
        'details',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'raw_data' => 'array',
        'aptitudes' => 'array',
        'skills' => 'array',
        'objectives' => 'array',
        'details' => 'array',
        'gametora_id' => 'integer',
    ];
}
