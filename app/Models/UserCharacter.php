<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Collection as CatalogCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

    public static function findForCatalogCharacter(?UmaCatalogItem $catalogItem, string $name): ?self
    {
        [$byIdentity, $legacyByName] = self::characterOwnershipIndexes();

        return $catalogItem ? $byIdentity->get($catalogItem->characterIdentityKey()) : $legacyByName->get($name);
    }

    /**
     * @param  CatalogCollection<int, UmaCatalogItem>|null  $catalog
     * @return array{Collection<string, self>, Collection<string, self>, Collection<int, string>, Collection<string, int>}
     */
    public static function characterOwnershipIndexes(?CatalogCollection $catalog = null): array
    {
        $catalog ??= UmaCatalogItem::characterCatalog()->get(['id', 'name', 'gametora_id', 'raw_data']);
        $claims = UmaCatalogItem::characterNameClaims($catalog);
        $byCatalogId = $catalog->keyBy('id');
        $byIdentity = collect();
        $legacyByName = collect();
        $identityByOwner = collect();
        $maxStarsByIdentity = collect();
        $owners = self::orderByDesc('is_owned')
            ->orderByRaw('CASE WHEN base_stars > current_stars THEN base_stars ELSE current_stars END DESC')
            ->orderByRaw('CASE WHEN uma_catalog_item_id IS NULL THEN 1 ELSE 0 END')->orderBy('id')->get();
        foreach ($owners as $ownership) {
            if ($ownership->uma_catalog_item_id !== null) {
                $identity = $byCatalogId->get($ownership->uma_catalog_item_id)?->characterIdentityKey();
            } else {
                $matches = $claims[$ownership->name] ?? [];
                if (count($matches) > 1) {
                    continue;
                }
                $legacyByName->put($ownership->name, $ownership);
                $identity = array_key_first($matches);
            }
            if ($identity !== null) {
                $identityByOwner->put($ownership->id, $identity);
                $maxStarsByIdentity->put($identity, max($maxStarsByIdentity->get($identity, 0), $ownership->base_stars, $ownership->current_stars));
                if (! $byIdentity->has($identity)) {
                    $byIdentity->put($identity, $ownership);
                }
            }
        }

        return [$byIdentity, $legacyByName, $identityByOwner, $maxStarsByIdentity];
    }

    public function saveForCatalogCharacter(?UmaCatalogItem $catalog): void
    {
        if ($catalog && ! $this->exists && self::where('name', $this->name)->exists()) {
            // The display name may still be the unique storage name of another identity.
            $prefix = "katalog-{$catalog->id}";
            $name = $prefix;
            for ($suffix = 2; self::where('name', $name)->exists(); $suffix++) {
                $name = "{$prefix}-{$suffix}";
            }
            $this->name = $name;
        }

        $this->save();
    }

    /** @param list<string> $fields */
    public function saveCharacterState(?UmaCatalogItem $catalog, array $fields): void
    {
        DB::transaction(function () use ($catalog, $fields): void {
            $this->saveForCatalogCharacter($catalog);

            if ($catalog) {
                [, , $identityByOwner] = self::characterOwnershipIndexes();
                $sameIdentity = $identityByOwner->filter(fn (string $identity) => $identity === $catalog->characterIdentityKey());
                self::whereKey($sameIdentity->keys()->all())->whereKeyNot($this->id)
                    ->update(Arr::only($this->getAttributes(), $fields));
            }
        });
    }
}
