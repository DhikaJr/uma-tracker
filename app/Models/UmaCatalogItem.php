<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class UmaCatalogItem extends Model
{
    private const CHARACTER_NAME_HISTORY = '_previous_catalog_names';

    private const RELOCATED_ALIAS = '_relocated_catalog_alias';

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
        static::addGlobalScope('exclude_relocated_catalog_aliases', function (Builder $builder) {
            $flag = 'raw_data->'.self::RELOCATED_ALIAS;
            $builder->where(fn (Builder $query) => $query->whereNull($flag)->orWhere($flag, false)->orWhere('type', '!=', 'character'));
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

    /** @param array<string, mixed> $card */
    public static function gameToraCharacterId(array $card, bool $rejectConflict = false): ?int
    {
        $ids = [];
        foreach ([$card['id'] ?? null, $card['card_id'] ?? null] as $value) {
            if (is_numeric($value) && (int) $value > 0) {
                $ids[] = (int) $value;
            }
        }

        if ($rejectConflict && count(array_unique($ids)) > 1) {
            throw new InvalidArgumentException("ID GameTora karakter bertentangan: id {$ids[0]}, card_id {$ids[1]}.");
        }

        return $ids[0] ?? null;
    }

    public function characterExternalId(): ?int
    {
        return $this->gametora_id > 0 ? $this->gametora_id : self::gameToraCharacterId($this->raw_data ?? []);
    }

    public function characterIdentityKey(): string
    {
        $externalId = $this->characterExternalId();

        return $externalId === null ? 'catalog-'.$this->id : 'gametora-'.$externalId;
    }

    /** @return Builder<self> */
    public static function characterCatalog(): Builder
    {
        return self::withRelocatedAliases()->withoutGlobalScope('exclude_phantom_character_duplicates')->where('type', 'character');
    }

    /** @return Builder<self> */
    public static function withRelocatedAliases(): Builder
    {
        return self::withoutGlobalScope('exclude_relocated_catalog_aliases');
    }

    public static function isRelocatedAliasData(?array $raw): bool
    {
        return ($raw[self::RELOCATED_ALIAS] ?? false) === true;
    }

    public function isRelocatedAlias(): bool
    {
        return self::isRelocatedAliasData($this->raw_data);
    }

    /** @return array<string, mixed>|null */
    public function upstreamRawData(): ?array
    {
        $raw = $this->raw_data;
        if ($this->type === 'character' && $raw !== null) {
            unset($raw[self::CHARACTER_NAME_HISTORY], $raw[self::RELOCATED_ALIAS]);
        }

        return $raw;
    }

    public function relocateCharacterAlias(string $name): void
    {
        $this->name = $name;
        $this->raw_data = array_replace($this->raw_data ?? [], [self::RELOCATED_ALIAS => true]);
        $this->rememberCharacterNames();
        $this->save();
    }

    /** @return list<string> */
    public static function characterNameHistory(?array $raw): array
    {
        $names = $raw[self::CHARACTER_NAME_HISTORY] ?? [];

        return is_array($names) ? array_values(array_filter($names, 'is_string')) : [];
    }

    /**
     * @param  Collection<int, self>  $catalog
     * @return array<string, array<string, true>>
     */
    public static function characterNameClaims(Collection $catalog): array
    {
        $claims = [];
        foreach ($catalog as $item) {
            $names = self::characterNameHistory($item->raw_data);
            if (! $item->isRelocatedAlias()) {
                $names[] = $item->name;
            }
            foreach ($names as $name) {
                $claims[$name][$item->characterIdentityKey()] = true;
            }
        }

        return $claims;
    }

    /** @param list<string> $aliases */
    public function rememberCharacterNames(array $aliases = []): void
    {
        $names = [
            ...$aliases,
            ...self::characterNameHistory($this->getOriginal('raw_data')),
            ...self::characterNameHistory($this->raw_data),
        ];
        if ($this->exists && $this->isDirty('name') && ! self::isRelocatedAliasData($this->getOriginal('raw_data'))) {
            $names[] = $this->getOriginal('name');
        }
        $names = array_values(array_diff(array_unique($names), [$this->name]));
        sort($names, SORT_STRING);

        $raw = $this->raw_data;
        unset($raw[self::CHARACTER_NAME_HISTORY]);
        if ($names !== []) {
            $raw[self::CHARACTER_NAME_HISTORY] = $names;
        }
        $this->raw_data = $raw;
    }

    /** @return Collection<int, self> */
    public static function charactersWithExternalId(int $externalId): Collection
    {
        return self::characterCatalog()
            ->where(fn (Builder $query) => $query->where('gametora_id', $externalId)
                ->orWhereNull('gametora_id')->orWhere('gametora_id', '<=', 0))
            ->orderBy('id')
            ->get()
            ->filter(fn (self $item) => $item->characterExternalId() === $externalId);
    }

    /** @param array<string, array<string, true>> $claims */
    public function characterOwnerBeforeRename(array $claims): ?UserCharacter
    {
        $oldName = $this->getOriginal('name');
        $linked = UserCharacter::where('uma_catalog_item_id', $this->id)->orderBy('id')->first();
        if ($linked || count($claims[$oldName] ?? []) !== 1) {
            return $linked;
        }

        return UserCharacter::whereNull('uma_catalog_item_id')->where('name', $oldName)->first();
    }
}
