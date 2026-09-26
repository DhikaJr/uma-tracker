<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting value by key.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        return $setting !== null ? $setting->value : $default;
    }

    /**
     * Set or update a setting value.
     */
    public static function setValue(string $key, mixed $value): static
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value]
        );
    }

    /**
     * Get all settings as a key-value associative array.
     *
     * @return array<string, string|null>
     */
    public static function getAll(): array
    {
        return static::query()->pluck('value', 'key')->toArray();
    }
}
