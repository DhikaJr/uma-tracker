<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class CharacterCatalogPlan
{
    /**
     * @template T of array{fullName: string, externalId: ?int}
     *
     * @param  list<T>  $entries
     * @param  Collection<int, UmaCatalogItem>  $catalog
     * @param  array<string, array<string, true>>  $nameClaims
     * @return list<T&array{item: UmaCatalogItem, aliases: list<UmaCatalogItem>, relocations: list<array{item: UmaCatalogItem, name: string}>, claimNames: list<string>}>
     */
    public static function resolve(array $entries, Collection $catalog, array $nameClaims): array
    {
        $byName = $catalog->keyBy('name');
        $byIdentity = $catalog->groupBy(fn (UmaCatalogItem $item) => $item->characterIdentityKey());
        $destinations = array_column($entries, 'externalId', 'fullName');
        $reservedNames = array_fill_keys([...$byName->keys(), ...array_keys($destinations)], true);
        $ownershipByIdentity = null;
        $plan = [];
        foreach ($entries as $entry) {
            ['fullName' => $fullName, 'externalId' => $externalId] = $entry;
            $named = $byName->get($fullName);
            $canAdoptName = count($nameClaims[$fullName] ?? []) <= 1;
            if ($externalId === null && ! $canAdoptName) {
                throw new InvalidArgumentException("Identitas GameTora diperlukan untuk karakter '{$fullName}' karena nama telah dipakai kartu lain.");
            }
            $identity = $externalId ?? $named?->characterExternalId();
            $aliases = $identity === null ? null : $byIdentity->get('gametora-'.$identity);
            $vacating = $aliases?->filter(fn (UmaCatalogItem $alias) => isset($destinations[$alias->name]) && $destinations[$alias->name] !== $identity) ?? collect();
            $item = $aliases?->firstWhere('name', $fullName);
            if ($item === null && $aliases) {
                if ($vacating->count() > 1) {
                    $ownershipByIdentity ??= UserCharacter::characterOwnershipIndexes($catalog)[0];
                    $owner = $ownershipByIdentity->get('gametora-'.$identity);
                    $item = $vacating->firstWhere('id', $owner?->uma_catalog_item_id)
                        ?? $vacating->firstWhere('name', $owner?->name);
                }
                $item ??= $vacating->first() ?? $aliases->first(fn (UmaCatalogItem $alias) => ! $alias->isRelocatedAlias()) ?? $aliases->first();
            }
            if ($item === null && $canAdoptName && $named?->characterExternalId() === null) {
                $item = $named;
            }
            $item ??= new UmaCatalogItem;
            $aliases = $aliases?->values()->all() ?? ($item->exists ? [$item] : []);
            $relocations = [];
            $claimNames = $entry['claimNames'] ?? [$fullName];
            foreach ($vacating as $alias) {
                if ($alias->is($item)) {
                    continue;
                }
                $prefix = "katalog-alias-{$alias->id}";
                $name = $prefix;
                for ($suffix = 2; isset($reservedNames[$name]); $suffix++) {
                    $name = "{$prefix}-{$suffix}";
                }
                $reservedNames[$name] = true;
                $relocations[] = ['item' => $alias, 'name' => $name];
                array_push($claimNames, $alias->name, ...UmaCatalogItem::characterNameHistory($alias->raw_data));
            }
            $entry['claimNames'] = array_values(array_unique($claimNames));
            $plan[] = $entry + compact('item', 'aliases', 'relocations');
        }

        usort($plan, fn (array $left, array $right) => [$left['externalId'] ?? PHP_INT_MAX, $left['fullName']] <=> [$right['externalId'] ?? PHP_INT_MAX, $right['fullName']]);
        $names = [];
        $identities = [];
        $moving = [];
        foreach ($plan as ['fullName' => $fullName, 'externalId' => $externalId, 'item' => $item, 'relocations' => $relocations]) {
            $identity = $externalId ?? $item->characterExternalId();
            if (isset($names[$fullName]) || ($identity !== null && isset($identities[$identity]))) {
                throw new InvalidArgumentException("Konflik identitas karakter '{$fullName}' untuk ID GameTora {$identity}.");
            }
            $names[$fullName] = true;
            if ($identity !== null) {
                $identities[$identity] = true;
            }
            if ($item->exists && $item->name !== $fullName) {
                $moving[$item->id] = true;
            }
            foreach ($relocations as $relocation) {
                $moving[$relocation['item']->id] = true;
            }
        }
        foreach ($plan as ['fullName' => $fullName, 'externalId' => $externalId, 'item' => $item]) {
            $occupant = $byName->get($fullName);
            if ($occupant && ! $occupant->is($item) && ! isset($moving[$occupant->id])) {
                throw new InvalidArgumentException("Konflik identitas karakter '{$fullName}' untuk ID GameTora {$externalId}.");
            }
        }

        return $plan;
    }

    /**
     * @param  list<array{fullName: string, externalId: ?int, item: UmaCatalogItem, claimNames: list<string>, relocations: list<array{item: UmaCatalogItem, name: string}>}>  $plan
     * @param  Collection<int, UmaCatalogItem>  $catalog
     * @param  array<string, array<string, true>>  $nameClaims
     * @return list<array{ownership: UserCharacter, item: UmaCatalogItem, name: string}>
     */
    public static function stageRenames(array $plan, Collection $catalog, array $nameClaims): array
    {
        $ownershipRenames = [];
        foreach ($plan as ['fullName' => $name, 'item' => $item]) {
            if (! $item->exists || $item->name === $name) {
                continue;
            }
            $ownership = $item->characterOwnerBeforeRename($nameClaims);
            if ($ownership) {
                $ownershipRenames[$ownership->id] = compact('ownership', 'item', 'name');
            }
            DB::table('uma_catalog_items')->where('id', $item->id)->update(['name' => (string) Str::uuid()]);
        }

        $catalogByIdentity = $catalog->groupBy(fn (UmaCatalogItem $item) => $item->characterIdentityKey());
        foreach ($plan as $entry) {
            $externalId = $entry['externalId'];
            $identity = $externalId === null ? $entry['item']->characterIdentityKey() : 'gametora-'.$externalId;
            foreach ($entry['claimNames'] ?? [$entry['fullName']] as $name) {
                $claims = $nameClaims[$name] ?? [];
                if (count($claims) !== 1 || isset($claims[$identity])) {
                    continue;
                }

                // Anchor the legacy owner before a new current or historical claim makes the name ambiguous.
                $previousAliases = $catalogByIdentity->get(array_key_first($claims));
                $item = $previousAliases?->firstWhere('name', $name) ?? $previousAliases?->first();
                $ownership = UserCharacter::whereNull('uma_catalog_item_id')->where('name', $name)->first();
                if ($item && $ownership) {
                    $ownershipRenames[$ownership->id] ??= compact('ownership', 'item', 'name');
                }
            }
        }

        foreach ($plan as ['relocations' => $relocations]) {
            foreach ($relocations as ['item' => $item, 'name' => $name]) {
                $item->relocateCharacterAlias($name);
            }
        }

        if ($ownershipRenames === []) {
            return [];
        }

        // A blocked name also blocks any move that needs the blocked owner's old name.
        $occupiedNames = UserCharacter::pluck('id', 'name');
        $movingOwners = $ownershipRenames;
        do {
            $before = count($movingOwners);
            foreach ($movingOwners as $id => ['name' => $name]) {
                $occupant = $occupiedNames->get($name);
                if ($occupant !== null && $occupant !== $id && ! isset($movingOwners[$occupant])) {
                    unset($movingOwners[$id]);
                }
            }
        } while ($before !== count($movingOwners));

        foreach ($ownershipRenames as $id => $rename) {
            if (isset($movingOwners[$id]) && $rename['name'] !== $rename['ownership']->name) {
                DB::table('user_characters')->where('id', $id)->update(['name' => (string) Str::uuid()]);
            } elseif (! isset($movingOwners[$id])) {
                $ownershipRenames[$id]['name'] = $rename['ownership']->name;
            }
        }

        return array_values($ownershipRenames);
    }

    /** @param list<array{ownership: UserCharacter, item: UmaCatalogItem, name: string}> $renames */
    public static function finishRenames(array $renames): void
    {
        foreach ($renames as ['ownership' => $ownership, 'item' => $item, 'name' => $name]) {
            $ownership->uma_catalog_item_id ??= $item->id;
            $ownership->name = $name;
            $ownership->save();
        }
    }
}
