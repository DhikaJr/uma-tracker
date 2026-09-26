<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CircleSnapshot extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'circle_id',
        'circle_name',
        'rank',
        'point',
        'member_count',
        'active_total',
        'period',
        'payload',
        'last_refreshed_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'payload' => 'array',
        'last_refreshed_at' => 'datetime',
        'rank' => 'integer',
        'point' => 'integer',
        'member_count' => 'integer',
        'active_total' => 'integer',
    ];
}
