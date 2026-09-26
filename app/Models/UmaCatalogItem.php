<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UmaCatalogItem extends Model
{
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
