<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\GachaBanner;
use App\Models\GachaPity;
use App\Models\GachaPull;
use App\Models\UmaCatalogItem;
use App\Models\UserCharacter;
use App\Services\GameToraSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class GameToraCharacterIdentityTest extends TestCase
{
    use RefreshDatabase;

    private string $originalStorage;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalStorage = storage_path();
        $this->app->useStoragePath(storage_path('framework/testing/'.uniqid('character-identity-')));
    }

    protected function tearDown(): void
    {
        $isolatedStorage = storage_path();
        $this->app->useStoragePath($this->originalStorage);
        File::deleteDirectory($isolatedStorage);

        parent::tearDown();
    }

    public function test_card_id_only_keeps_legacy_owned_character_at_five_stars(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet');
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->getJson('/api/collection/characters/detail?name=Daiwa%20Scarlet%20%5BScarlet%20Gale%5D')
            ->assertOk()->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');
    }

    public function test_same_external_id_with_new_title_updates_the_owned_catalog_row(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $this->fakeGameTora([['id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->getJson('/api/collection/characters/detail?name=Daiwa%20Scarlet%20%5BScarlet%20Gale%5D')
            ->assertOk()->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');
    }

    public function test_sync_rejects_same_name_with_different_external_ids(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Scarlet Gale]');
        $this->fakeGameTora([
            ['id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Temporary Title'],
            ['id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Different Costume'],
            ['id' => 100905, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Different Costume'],
        ]);

        $this->postJson('/api/gacha/sync-gametora')->assertInternalServerError()
            ->assertJsonPath('success', false)
            ->assertJsonFragment(['message' => "Gagal menyinkronkan data dari GameTora: Konflik identitas karakter 'Daiwa Scarlet [Different Costume]' untuk ID GameTora 100905."]);

        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');
        $this->assertNull(AppSetting::getValue('gametora_manifest_hash'));
    }

    public function test_backup_merge_rejects_same_name_with_different_external_ids(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Scarlet Gale]');

        $this->postJson('/api/backup/import', [
            'mode' => 'merge',
            'data' => ['version' => '2.0', 'data' => [
                'uma_catalog_items' => [
                    ['id' => 900, 'type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100904],
                ],
            ]],
        ])->assertUnprocessable()->assertJsonPath('success', false);

        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_another_external_id_can_use_the_vacated_name_without_inheriting_ownership(bool $reverse): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $cards = [
            ['id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
            ['id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Old Title'],
        ];
        $this->fakeGameTora($reverse ? array_reverse($cards) : $cards);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $other = UmaCatalogItem::where('gametora_id', 100904)->sole();
        $this->getJson('/api/collection/characters/detail?id='.$other->id)->assertOk()
            ->assertJsonPath('character.is_owned', false);
        $this->postJson('/api/collection/characters/stars', ['name' => $other->name, 'stars' => 4])->assertOk()
            ->assertJsonPath('character.current_stars', 4);

        $this->assertDatabaseHas('user_characters', ['uma_catalog_item_id' => $other->id, 'current_stars' => 4]);
        $this->assertDatabaseHas('user_characters', ['id' => $owned->id, 'uma_catalog_item_id' => $owned->uma_catalog_item_id, 'current_stars' => 5]);
        $this->assertDatabaseCount('user_characters', 2);
        $this->assertSame($owned->uma_catalog_item_id + 1, $other->id);
        $this->assertSame('Daiwa Scarlet [Scarlet Gale]', $owned->catalogItem()->firstOrFail()->name);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_two_owned_cards_can_swap_catalog_and_ownership_names_atomically(): void
    {
        $first = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $other = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100904]);
        $second = UserCharacter::factory()->for($other, 'catalogItem')->create(['name' => $other->name, 'current_stars' => 4, 'is_owned' => true]);
        $this->fakeGameTora([
            ['card_id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Old Title'],
            ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
        ]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        foreach ([[$first, 100903, 'Daiwa Scarlet [Scarlet Gale]', 5], [$second, 100904, 'Daiwa Scarlet [Old Title]', 4]] as [$owner, $externalId, $name, $stars]) {
            $this->assertDatabaseHas('uma_catalog_items', ['id' => $owner->uma_catalog_item_id, 'gametora_id' => $externalId, 'name' => $name]);
            $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'uma_catalog_item_id' => $owner->uma_catalog_item_id, 'name' => $name, 'current_stars' => $stars, 'is_owned' => true]);
        }
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_duplicate_backup_aliases_preserve_owned_five_star_state_in_either_order(bool $reverse): void
    {
        $aliases = [
            ['id' => 900, 'type' => 'character', 'name' => 'Daiwa Scarlet [Alpha]', 'gametora_id' => 100903],
            ['id' => 901, 'type' => 'character', 'name' => 'Daiwa Scarlet [Beta]', 'gametora_id' => 100903,
                'skills' => ['evolve' => [['id' => 100903211, 'name_en' => 'Scarlet Gale']]]],
        ];
        $ownership = [
            ['name' => $aliases[0]['name'], 'uma_catalog_item_id' => 900, 'is_owned' => true, 'current_stars' => 5],
            ['name' => $aliases[1]['name'], 'uma_catalog_item_id' => 901, 'is_owned' => false, 'current_stars' => 3],
        ];

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => $reverse ? array_reverse($aliases) : $aliases,
            'user_characters' => $reverse ? array_reverse($ownership) : $ownership,
        ]]])->assertOk()->assertJsonPath('unresolved_references', [])->assertJsonCount(1, 'conflicts');

        $catalog = UmaCatalogItem::where('type', 'character')->sole();
        $owner = UserCharacter::sole();
        $this->assertSame('Daiwa Scarlet [Alpha]', $catalog->name);
        $this->assertSame(100903, $catalog->gametora_id);
        $this->assertSame([100903211], array_column($catalog->skills['evolve'], 'id'));
        $this->assertSame($catalog->id, $owner->uma_catalog_item_id);
        $this->assertTrue($owner->is_owned);
        $this->assertSame(5, $owner->current_stars);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith([false, 3])]
    #[TestWith([true, 4])]
    public function test_backup_merge_never_downgrades_local_owned_progression(bool $incomingOwned, int $incomingStars): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $catalogId = $owner->uma_catalog_item_id;
        $name = 'Daiwa Scarlet [Scarlet Gale]';

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => [['id' => 900, 'type' => 'character', 'name' => $name, 'gametora_id' => 100903]],
            'user_characters' => [['name' => $name, 'uma_catalog_item_id' => 900, 'is_owned' => $incomingOwned, 'current_stars' => $incomingStars]],
        ]]])->assertOk()->assertJsonPath('unresolved_references', []);

        $this->assertSame($catalogId, $owner->refresh()->uma_catalog_item_id);
        $this->assertTrue($owner->is_owned);
        $this->assertSame(5, $owner->current_stars);
        $this->assertCollectionOwnership($owner, $name, 'Scarlet Gale');
    }

    #[TestWith([[0, 1, 2]])]
    #[TestWith([[2, 0, 1]])]
    #[TestWith([[1, 2, 0]])]
    public function test_backup_permutations_produce_same_ownership_and_complete_name_history(array $order): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $catalogId = $owner->uma_catalog_item_id;
        $owner->catalogItem()->firstOrFail()->update(['raw_data' => [
            'card_id' => 100903, '_previous_catalog_names' => ['Daiwa Scarlet [Local History]'],
        ]]);
        $rows = [
            ['id' => 900, 'type' => 'character', 'name' => 'Daiwa Scarlet [Alpha]', 'gametora_id' => 100903,
                'raw_data' => ['_previous_catalog_names' => ['Daiwa Scarlet [Alpha History]']]],
            ['id' => 901, 'type' => 'character', 'name' => 'Daiwa Scarlet [Old Title]', 'gametora_id' => 100904],
            ['id' => 902, 'type' => 'character', 'name' => 'Daiwa Scarlet [Beta]', 'gametora_id' => 100903,
                'raw_data' => json_encode(['_previous_catalog_names' => ['Daiwa Scarlet [Beta History]']], JSON_THROW_ON_ERROR)],
        ];
        $owners = [
            ['name' => $rows[0]['name'], 'uma_catalog_item_id' => 900, 'is_owned' => false, 'current_stars' => 3],
            ['name' => $rows[1]['name'], 'uma_catalog_item_id' => 901, 'is_owned' => true, 'current_stars' => 3],
            ['name' => $rows[2]['name'], 'uma_catalog_item_id' => 902, 'is_owned' => true, 'current_stars' => 4],
        ];

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => array_map(fn (int $index) => $rows[$index], $order),
            'user_characters' => array_map(fn (int $index) => $owners[$index], array_reverse($order)),
        ]]])->assertOk()->assertJsonPath('unresolved_references', [])
            ->assertJsonPath('conflicts.0.selected_name', 'Daiwa Scarlet [Beta]');

        $catalog = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->assertSame($catalogId, $catalog->id);
        $this->assertSame('Daiwa Scarlet [Alpha]', $catalog->name);
        $this->assertSame([
            'Daiwa Scarlet [Alpha History]', 'Daiwa Scarlet [Beta History]', 'Daiwa Scarlet [Beta]',
            'Daiwa Scarlet [Local History]', 'Daiwa Scarlet [Old Title]',
        ], $catalog->raw_data['_previous_catalog_names']);
        $other = UmaCatalogItem::where('gametora_id', 100904)->sole();
        $this->assertSame($catalogId + 1, $other->id);
        $this->assertDatabaseCount('user_characters', 2);
        $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'uma_catalog_item_id' => $catalogId, 'is_owned' => true, 'current_stars' => 5]);
        $this->assertDatabaseHas('user_characters', ['uma_catalog_item_id' => $other->id, 'is_owned' => true, 'current_stars' => 3]);
        $this->getJson('/api/collection/characters')->assertOk()->assertJsonCount(2, 'characters')
            ->assertJsonPath('characters.0.name', 'Daiwa Scarlet [Alpha]')->assertJsonPath('characters.0.current_stars', 5)
            ->assertJsonPath('characters.1.name', 'Daiwa Scarlet [Old Title]')->assertJsonPath('characters.1.current_stars', 3);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith([[0, 1, 2]])]
    #[TestWith([[0, 2, 1]])]
    #[TestWith([[1, 0, 2]])]
    #[TestWith([[1, 2, 0]])]
    #[TestWith([[2, 0, 1]])]
    #[TestWith([[2, 1, 0]])]
    public function test_adversarial_backup_combines_ownership_and_maximum_stars_across_all_aliases(array $order): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Alpha]');
        $owner->update(['is_owned' => false, 'current_stars' => 4]);
        $catalogId = $owner->uma_catalog_item_id;
        $catalog = [];
        $ownership = [];
        foreach ([['Alpha', false, 5], ['Beta', true, 3], ['Gamma', true, 4]] as $index => [$title, $owned, $stars]) {
            $name = "Daiwa Scarlet [{$title}]";
            $catalog[] = ['id' => 900 + $index, 'type' => 'character', 'name' => $name, 'gametora_id' => 100903];
            $ownership[] = ['name' => $name, 'uma_catalog_item_id' => 900 + $index, 'is_owned' => $owned, 'current_stars' => $stars];
        }
        $request = ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => array_map(fn (int $index) => $catalog[$index], $order),
            'user_characters' => array_map(fn (int $index) => $ownership[$index], $order),
        ]]];

        $this->postJson('/api/backup/import', $request)->assertOk()->assertJsonPath('unresolved_references', []);
        $this->postJson('/api/backup/import', $request)->assertOk()->assertJsonPath('unresolved_references', []);

        $this->assertCollectionOwnership($owner, 'Daiwa Scarlet [Alpha]', 'Alpha');
        $item = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->assertSame($catalogId, $item->id);
        $this->assertSame(['Daiwa Scarlet [Beta]', 'Daiwa Scarlet [Gamma]'], $item->raw_data['_previous_catalog_names']);
    }

    public function test_adversarial_backup_keeps_local_maximum_from_non_winning_alias(): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Alpha]');
        $owner->update(['current_stars' => 4]);
        $alias = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Beta]', 'gametora_id' => 100903]);
        UserCharacter::factory()->for($alias, 'catalogItem')->create(['name' => $alias->name, 'current_stars' => 5, 'is_owned' => false]);

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'user_characters' => [['name' => $owner->name, 'gametora_id' => 100903, 'is_owned' => true, 'current_stars' => 3]],
        ]]])->assertOk()->assertJsonPath('unresolved_references', []);

        $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'uma_catalog_item_id' => $owner->uma_catalog_item_id, 'is_owned' => true, 'current_stars' => 5]);
        $this->getJson('/api/collection/characters/detail?id='.$alias->id)->assertOk()
            ->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_adversarial_catalog_only_backup_preserves_legacy_owner_when_a_new_alias_claims_its_name(bool $secondaryRow): void
    {
        $name = 'Daiwa Scarlet [Former]';
        $owner = $this->ownedCharacter($name);
        $item = $owner->catalogItem()->firstOrFail();
        $item->update(['raw_data' => ['card_id' => 100903, 'char_id' => 1009], 'skills' => ['evolve' => [['id' => 100903211, 'name_en' => 'Scarlet Gale']]]]);
        $owner->update(['uma_catalog_item_id' => null]);
        $this->getJson('/api/collection/characters/detail?id='.$item->id)->assertOk()->assertJsonPath('character.is_owned', true);
        $incoming = [['id' => 900, 'type' => 'character', 'name' => 'Daiwa Scarlet [Alpha]', 'gametora_id' => 100904]];
        if ($secondaryRow) {
            $incoming[] = ['id' => 901, 'type' => 'character', 'name' => $name, 'gametora_id' => 100904];
        } else {
            $incoming[0]['raw_data'] = ['_previous_catalog_names' => [$name]];
        }

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => $incoming,
        ]]])->assertOk()->assertJsonPath('unresolved_references', []);

        $this->getJson('/api/collection/characters/detail?id='.$item->id)->assertOk()
            ->assertJsonPath('character.id', $owner->id)->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
        $this->getJson('/api/collection/characters')->assertOk()->assertJsonPath('stats.total_owned', 1);
        $this->getJson('/api/collection/skill-sources?q=Scarlet%20Gale&rarity=evolved&owned_only=1')->assertOk()
            ->assertJsonPath('skills.0.characters.0.id', $owner->id)->assertJsonPath('skills.0.characters.0.current_stars', 5);
        $this->getJson('/api/affinity/recommendations/1003')->assertOk()->assertJsonPath('owned_count', 1);
        $this->assertSame($owner->id, UserCharacter::findForCatalogCharacter($item, $name)?->id);
        $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'uma_catalog_item_id' => $item->id, 'current_stars' => 5]);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_adversarial_archive_alias_does_not_block_current_name_transition(bool $reverse): void
    {
        $archive = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Archive]', 'gametora_id' => 100903]);
        $owner = $this->ownedCharacter('Daiwa Scarlet [Current]');
        $currentId = $owner->uma_catalog_item_id;
        $incoming = [
            ['id' => 900, 'type' => 'character', 'name' => 'Daiwa Scarlet [Next]', 'gametora_id' => 100903],
            ['id' => 901, 'type' => 'character', 'name' => 'Daiwa Scarlet [Current]', 'gametora_id' => 100904],
        ];
        $request = ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => $reverse ? array_reverse($incoming) : $incoming,
        ]]];

        $this->postJson('/api/backup/import', $request)->assertOk()->assertJsonPath('unresolved_references', []);
        $this->postJson('/api/backup/import', $request)->assertOk()->assertJsonPath('unresolved_references', []);

        $this->assertDatabaseHas('uma_catalog_items', ['id' => $archive->id, 'gametora_id' => 100903, 'name' => $archive->name]);
        $this->assertDatabaseHas('uma_catalog_items', ['id' => $currentId, 'gametora_id' => 100903, 'name' => 'Daiwa Scarlet [Next]']);
        $next = UmaCatalogItem::findOrFail($currentId);
        $this->assertContains('Daiwa Scarlet [Current]', $next->raw_data['_previous_catalog_names']);
        $other = UmaCatalogItem::where('gametora_id', 100904)->sole();
        $this->assertSame('Daiwa Scarlet [Current]', $other->name);
        $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'uma_catalog_item_id' => $currentId, 'is_owned' => true, 'current_stars' => 5]);
        $this->getJson('/api/collection/characters/detail?id='.$other->id)->assertOk()->assertJsonPath('character.is_owned', false);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_adversarial_v1_historical_catalog_and_ownership_only_retry_remap_to_existing_card(): void
    {
        $old = 'Daiwa Scarlet [Old]';
        $new = 'Daiwa Scarlet [New]';
        $catalog = UmaCatalogItem::create(['type' => 'character', 'name' => $old, 'gametora_id' => 100903]);
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'New']]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $legacyOwner = ['name' => $old, 'uma_catalog_item_id' => 900, 'current_stars' => 5, 'is_owned' => true];
        $backup = ['uma_catalog_items' => [['id' => 900, 'type' => 'character', 'name' => $old]], 'user_characters' => [$legacyOwner]];
        $first = $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '1.0', 'data' => $backup]]);
        $retry = $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '1.0', 'data' => [
            'user_characters' => [$legacyOwner],
        ]]]);
        $repeat = $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '1.0', 'data' => $backup]]);

        foreach ([$first, $retry, $repeat] as $response) {
            $response->assertOk()->assertJsonPath('unresolved_references', [])->assertJsonPath('summary.user_characters', 1);
        }
        $item = UmaCatalogItem::where('type', 'character')->sole();
        $owner = UserCharacter::sole();
        $this->assertSame($catalog->id, $item->id);
        $this->assertSame($new, $item->name);
        $this->assertSame(100903, $item->gametora_id);
        $this->assertSame($item->id, $owner->uma_catalog_item_id);
        $this->assertTrue($owner->is_owned);
        $this->assertSame(5, $owner->current_stars);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith(['merge', null])]
    #[TestWith(['overwrite', null])]
    #[TestWith(['merge', 100904])]
    #[TestWith(['overwrite', 100904])]
    public function test_adversarial_v2_round_trip_preserves_alternate_storage_name_foreign_key(string $mode, ?int $externalId): void
    {
        $reservedName = 'Daiwa Scarlet [Former]';
        $oldOwner = $this->ownedCharacter($reservedName);
        $oldOwner->catalogItem()->firstOrFail()->update(['name' => 'Daiwa Scarlet [Next]']);
        $target = UmaCatalogItem::create(['type' => 'character', 'name' => $reservedName, 'gametora_id' => $externalId]);
        $storedId = $this->postJson('/api/collection/characters/stars', ['name' => $reservedName, 'stars' => 5])
            ->assertOk()->assertJsonPath('character.is_owned', true)->json('character.id');
        $this->assertDatabaseHas('user_characters', ['id' => $storedId, 'uma_catalog_item_id' => $target->id, 'current_stars' => 5]);
        $this->assertNotSame($reservedName, UserCharacter::findOrFail($storedId)->name);
        $backup = $this->getJson('/api/backup/export')->assertOk()->json();
        $semanticOwnership = function (array $payload): array {
            $catalog = array_column($payload['data']['uma_catalog_items'], null, 'id');
            $ownership = array_map(fn (array $record) => [
                'name' => $catalog[$record['uma_catalog_item_id']]['name'] ?? null,
                'gametora_id' => $catalog[$record['uma_catalog_item_id']]['gametora_id'] ?? null,
                'stars' => $record['current_stars'],
                'owned' => $record['is_owned'],
            ], $payload['data']['user_characters']);

            return collect($ownership)->sortBy('name')->values()->all();
        };
        UserCharacter::query()->delete();
        UmaCatalogItem::characterCatalog()->delete();

        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->postJson('/api/backup/import', ['mode' => $mode, 'data' => $backup])->assertOk()
                ->assertJsonPath('unresolved_references', []);
            $restored = UmaCatalogItem::where('type', 'character')->where('name', $reservedName)->sole();
            $this->assertDatabaseHas('user_characters', ['uma_catalog_item_id' => $restored->id, 'current_stars' => 5, 'is_owned' => true]);
            $this->getJson('/api/collection/characters/detail?id='.$restored->id)->assertOk()
                ->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
        }
        $this->assertDatabaseCount('user_characters', 2);
        $this->assertSame($semanticOwnership($backup), $semanticOwnership($this->getJson('/api/backup/export')->assertOk()->json()));
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_unresolved_explicit_backup_id_cannot_attach_to_a_matching_name(): void
    {
        $catalog = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Old Title]', 'gametora_id' => 100903]);
        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'user_characters' => [['name' => $catalog->name, 'gametora_id' => 100904, 'is_owned' => true, 'current_stars' => 5]],
        ]]])->assertOk()->assertJsonPath('unresolved_references.0.gametora_id', 100904);

        $this->getJson('/api/collection/characters')->assertOk()->assertJsonPath('stats.total_owned', 0);
        $this->getJson('/api/collection/characters/detail?id='.$catalog->id)->assertOk()->assertJsonPath('character.is_owned', false);

        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $this->getJson('/api/collection/characters/detail?id='.$catalog->id)->assertOk()->assertJsonPath('character.is_owned', false);
        $this->assertDatabaseMissing('user_characters', ['uma_catalog_item_id' => $catalog->id]);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith(['0.9'])]
    #[TestWith(['1.0'])]
    public function test_legacy_backup_resolves_an_unambiguous_name_only(string $version): void
    {
        $catalog = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Old Title]', 'gametora_id' => 100903]);
        $legacy = ['name' => $catalog->name, 'is_owned' => true, 'current_stars' => 5];
        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => $version, 'data' => [
            'user_characters' => [$legacy],
        ]]])->assertOk()->assertJsonPath('unresolved_references', []);
        $this->assertDatabaseHas('user_characters', ['uma_catalog_item_id' => $catalog->id, 'is_owned' => true, 'current_stars' => 5]);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_legacy_backup_cannot_attach_ownership_to_a_reused_historical_name(): void
    {
        $catalog = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Old Title]', 'gametora_id' => 100903]);
        $oldName = $catalog->name;
        $this->fakeGameTora([
            ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
            ['card_id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Old Title'],
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $other = UmaCatalogItem::where('gametora_id', 100904)->sole();

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '1.0', 'data' => [
            'uma_catalog_items' => [['id' => 900, 'type' => 'character', 'name' => $oldName]],
            'user_characters' => [['name' => $oldName, 'uma_catalog_item_id' => 900, 'is_owned' => true, 'current_stars' => 5]],
        ]]])->assertOk()->assertJsonCount(1, 'unresolved_references');

        $this->getJson('/api/collection/characters/detail?id='.$other->id)->assertOk()->assertJsonPath('character.is_owned', false);
        $this->assertDatabaseCount('user_characters', 0);
        $this->assertSame(100904, $other->refresh()->raw_data['card_id']);
        $this->assertSame(100903, $catalog->refresh()->gametora_id);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_conflicting_id_and_card_id_leave_catalog_and_manifest_unchanged(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $this->fakeGameTora([['id' => 100904, 'card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $this->postJson('/api/gacha/sync-gametora')->assertInternalServerError();

        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Old Title]', 'Old Title');
        $this->assertDatabaseMissing('uma_catalog_items', ['gametora_id' => 100904]);
        $this->assertNull(AppSetting::getValue('gametora_manifest_hash'));
    }

    public function test_finder_and_collection_use_owned_stars_from_historical_alias(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet');
        $alias = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Daiwa Scarlet [Scarlet Gale]',
            'gametora_id' => 100903,
            'skills' => ['evolve' => [['id' => 100903211, 'name_en' => 'Scarlet Gale']]],
        ]);

        $this->getJson('/api/collection/characters')->assertOk()->assertJsonCount(1, 'characters')
            ->assertJsonPath('characters.0.is_owned', true)->assertJsonPath('characters.0.current_stars', 5);
        $this->getJson('/api/collection/characters/detail?id='.$alias->id)->assertOk()
            ->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
        foreach (['', '&owned_only=1'] as $filter) {
            $this->getJson('/api/collection/skill-sources?q=Scarlet%20Gale&rarity=evolved'.$filter)->assertOk()
                ->assertJsonPath('skills.0.characters.0.catalog_id', $alias->id)
                ->assertJsonPath('skills.0.characters.0.is_owned', true)
                ->assertJsonPath('skills.0.characters.0.current_stars', 5);
        }
        $this->assertDatabaseHas('user_characters', ['id' => $owned->id, 'uma_catalog_item_id' => $owned->uma_catalog_item_id, 'current_stars' => 5]);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_legacy_historical_name_keeps_stronger_ownership_across_collection_finder_and_affinity(): void
    {
        $alias = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Daiwa Scarlet [Scarlet Gale]',
            'gametora_id' => 100903,
            'raw_data' => ['char_id' => 1009, 'name_en' => 'Daiwa Scarlet', '_previous_catalog_names' => ['Daiwa Scarlet [Old Title]']],
            'skills' => ['evolve' => [['id' => 100903211, 'name_en' => 'Scarlet Gale']]],
        ]);
        $legacy = UserCharacter::factory()->create([
            'name' => 'Daiwa Scarlet [Old Title]', 'uma_catalog_item_id' => null, 'current_stars' => 5, 'is_owned' => true,
        ]);
        $linked = UserCharacter::factory()->for($alias, 'catalogItem')->create(['name' => $alias->name, 'base_stars' => 3, 'current_stars' => 3, 'is_owned' => false]);
        $second = UmaCatalogItem::create([
            'type' => 'character', 'name' => 'Gold Ship [Red Strife]', 'gametora_id' => 100701, 'raw_data' => ['char_id' => 1007],
        ]);
        UserCharacter::factory()->for($second, 'catalogItem')->create(['name' => $second->name, 'is_owned' => true]);

        $this->getJson('/api/collection/characters')->assertOk()
            ->assertJsonPath('characters.0.id', $legacy->id)->assertJsonPath('characters.0.current_stars', 5)
            ->assertJsonPath('characters.0.is_owned', true)->assertJsonPath('stats.total_owned', 2);
        $this->getJson('/api/collection/characters/detail?id='.$alias->id)->assertOk()
            ->assertJsonPath('character.id', $legacy->id)->assertJsonPath('character.current_stars', 5)->assertJsonPath('character.is_owned', true);
        $this->getJson('/api/collection/skill-sources?q=Scarlet%20Gale&rarity=evolved&owned_only=1')->assertOk()
            ->assertJsonPath('skills.0.characters.0.id', $legacy->id)->assertJsonPath('skills.0.characters.0.current_stars', 5)
            ->assertJsonPath('skills.0.characters.0.is_owned', true);
        $pair = $this->getJson('/api/affinity/recommendations/1003')->assertOk()->assertJsonPath('owned_count', 2)->json('recommendations.0');
        $parent = collect([$pair['parent1'], $pair['parent2']])->firstWhere('char_id', 1009);
        $this->assertSame($alias->id, $parent['catalog_id']);
        $this->assertSame(5, $parent['rarity']);
        $this->assertNull($legacy->refresh()->uma_catalog_item_id);
        $this->assertFalse($linked->refresh()->is_owned);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_reused_name_remains_writable_when_previous_owner_keeps_its_storage_name(): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $oldName = $owner->name;
        $unlinked = UserCharacter::factory()->create([
            'name' => 'Daiwa Scarlet [Scarlet Gale]', 'uma_catalog_item_id' => null, 'is_owned' => false,
        ]);
        $this->fakeGameTora([
            ['id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Old Title'],
            ['id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $other = UmaCatalogItem::where('gametora_id', 100904)->sole();
        $this->assertSame($oldName, $owner->refresh()->name);

        $updatedId = $this->postJson('/api/collection/characters/stars', ['name' => $oldName, 'stars' => 4])->assertOk()
            ->assertJsonPath('character.name', $oldName)->assertJsonPath('character.current_stars', 4)->json('character.id');
        $this->assertNotSame($owner->id, $updatedId);
        $this->assertDatabaseHas('user_characters', ['id' => $updatedId, 'uma_catalog_item_id' => $other->id, 'current_stars' => 4, 'is_owned' => true]);
        $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'current_stars' => 5, 'is_owned' => true]);
        $this->assertNull($unlinked->refresh()->uma_catalog_item_id);
        $this->postJson('/api/collection/characters/toggle', ['name' => $oldName, 'is_owned' => false])->assertOk()->assertJsonPath('character.id', $updatedId);
        $this->getJson('/api/collection/characters/detail?id='.$other->id)->assertOk()->assertJsonPath('character.is_owned', false);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_name_reuse_preserves_previously_unambiguous_legacy_owner_and_allows_new_owner(): void
    {
        $legacy = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $catalog = $legacy->catalogItem()->firstOrFail();
        $catalog->update(['name' => 'Daiwa Scarlet [Scarlet Gale]', 'raw_data' => [
            'card_id' => 100903, '_previous_catalog_names' => [$legacy->name],
        ]]);
        $legacy->update(['uma_catalog_item_id' => null]);
        $this->fakeGameTora([
            ['card_id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Old Title'],
            ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
        ]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $other = UmaCatalogItem::where('gametora_id', 100904)->sole();
        $this->getJson('/api/collection/characters/detail?id='.$catalog->id)->assertOk()
            ->assertJsonPath('character.id', $legacy->id)->assertJsonPath('character.is_owned', true)->assertJsonPath('character.current_stars', 5);
        $this->getJson('/api/collection/characters/detail?id='.$other->id)->assertOk()->assertJsonPath('character.is_owned', false);
        $this->postJson('/api/collection/characters/stars', ['name' => $other->name, 'stars' => 4])->assertOk();
        $this->assertDatabaseHas('user_characters', ['id' => $legacy->id, 'uma_catalog_item_id' => $catalog->id, 'current_stars' => 5]);
        $this->assertDatabaseHas('user_characters', ['uma_catalog_item_id' => $other->id, 'current_stars' => 4]);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_collection_edits_keep_historical_ownership_aliases_in_agreement(): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet');
        $alias = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $aliasOwner = UserCharacter::factory()->for($alias, 'catalogItem')->create([
            'name' => $alias->name, 'is_owned' => true, 'current_stars' => 5,
        ]);

        $this->postJson('/api/collection/characters/stars', ['name' => $alias->name, 'stars' => 4])->assertOk();
        $this->postJson('/api/collection/characters/toggle', ['name' => $alias->name, 'is_owned' => false])->assertOk();

        foreach ([$owner, $aliasOwner] as $record) {
            $this->assertDatabaseHas('user_characters', [
                'id' => $record->id, 'uma_catalog_item_id' => $record->uma_catalog_item_id, 'current_stars' => 4, 'is_owned' => false,
            ]);
        }
        $this->getJson('/api/collection/characters/detail?id='.$alias->id)->assertOk()
            ->assertJsonPath('character.current_stars', 4)->assertJsonPath('character.is_owned', false);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_missing_evolution_manifest_preserves_published_data_and_normal_retry_recovers(): void
    {
        $manifest = ['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports', 'skills' => 'skills'];
        $activeManifest = $manifest + ['evolutions' => 'first'];
        $evolution = $this->evolutionRow();
        $this->fakeGameTora(
            [['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']],
            $this->evolutionFixtures($evolution) + [
                GameToraSyncService::MANIFEST_URL => function () use (&$activeManifest) {
                    return Http::response($activeManifest);
                },
            ]
        );
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $card = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $before = $card->getAttributes();
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $this->assertSame([100903211], array_column($card->skills['evolve'], 'id'));

        $activeManifest = $manifest;
        $this->postJson('/api/gacha/sync-gametora')->assertInternalServerError();
        $this->postJson('/api/gacha/sync-gametora', ['force' => true, 'allow_evolution_removals' => true])->assertInternalServerError();
        $this->assertSame($before, $card->refresh()->getAttributes());
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));

        $activeManifest = $manifest + ['evolutions' => 'complete'];
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertSame([100903211], array_column($card->refresh()->skills['evolve'], 'id'));
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
    }

    public function test_evolution_history_on_old_alias_blocks_partial_sync_and_recovers_with_complete_data(): void
    {
        $card = ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet'];
        $manifest = ['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports', 'skills' => 'skills'];
        $activeManifest = $manifest + ['evolutions' => 'first'];
        $currentCards = [$card + ['title_en' => 'Old Title']];
        $daiwa = $this->evolutionRow();
        $creek = $this->evolutionRow(102902, 102902211);
        $this->fakeGameTora([], $this->evolutionFixtures($daiwa) + [
            GameToraSyncService::MANIFEST_URL => function () use (&$activeManifest) {
                return Http::response($activeManifest);
            },
            GameToraSyncService::DATA_BASE_URL.'/character-cards.cards.json' => function () use (&$currentCards) {
                return Http::response($currentCards);
            },
            GameToraSyncService::DATA_BASE_URL.'/evolutions.partial.json' => Http::sequence()->push([$creek])->push([$creek])->push([$daiwa, $creek]),
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $old = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $alias = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $currentCards = [$card + ['title_en' => 'Scarlet Gale'], ['card_id' => 102902, 'name_en' => 'Super Creek']];
        $activeManifest = $manifest + ['evolutions' => 'partial'];

        $this->postJson('/api/gacha/sync-gametora')->assertInternalServerError();
        $this->postJson('/api/gacha/sync-gametora', ['force' => true])->assertInternalServerError();
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame([100903211], array_column($old->refresh()->skills['evolve'], 'id'));
        $this->assertNull($alias->refresh()->skills);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame([100903211], array_column($alias->refresh()->skills['evolve'], 'id'));
        $this->assertSame($old->skills['evolve'], $alias->skills['evolve']);
    }

    public function test_confirmed_removal_replaces_history_on_every_alias_while_force_alone_rejects_it(): void
    {
        $old = $this->ownedCharacter('Daiwa Scarlet [Old Title]')->catalogItem()->firstOrFail();
        $alias = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $manifest = ['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports', 'skills' => 'skills'];
        $activeManifest = $manifest + ['evolutions' => 'first'];
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']], $this->evolutionFixtures($this->evolutionRow()) + [
            GameToraSyncService::MANIFEST_URL => function () use (&$activeManifest) {
                return Http::response($activeManifest);
            },
            GameToraSyncService::DATA_BASE_URL.'/evolutions.replacement.json' => Http::response([$this->evolutionRow(100903, 102902211)]),
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $activeManifest = $manifest + ['evolutions' => 'replacement'];

        $this->postJson('/api/gacha/sync-gametora', ['force' => true])->assertInternalServerError();
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame([100903211], array_column($old->refresh()->skills['evolve'], 'id'));
        $this->assertSame([100903211], array_column($alias->refresh()->skills['evolve'], 'id'));

        $this->postJson('/api/gacha/sync-gametora', ['allow_evolution_removals' => true])->assertOk();
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        foreach ([$old, $alias] as $card) {
            $this->assertSame([102902211], array_column($card->refresh()->skills['evolve'], 'id'));
            $this->assertSame([102902211], array_column($card->raw_data['skills_evo'], 'new'));
        }
        $this->postJson('/api/gacha/sync-gametora', ['force' => true])->assertOk();
    }

    #[TestWith(['base_skill'])]
    #[TestWith(['empty_conditions'])]
    #[TestWith(['missing_conditions'])]
    #[TestWith(['skill_effect'])]
    #[TestWith(['effect_value'])]
    public function test_semantically_degraded_evolution_is_rejected_before_any_catalog_write(string $degradation): void
    {
        $old = $this->ownedCharacter('Daiwa Scarlet [Old Title]')->catalogItem()->firstOrFail();
        $alias = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $manifest = ['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports'];
        $activeManifest = $manifest + ['skills' => 'first', 'evolutions' => 'first'];
        $title = 'Scarlet Gale';
        $evolution = $this->evolutionRow();
        $next = $evolution;
        $evolvedSkill = ['id' => 100903211, 'enname' => 'Scarlet Gale', 'rarity' => 6, 'condition_groups' => [[
            'condition' => 'distance_rate>=50', 'base_time' => 30000, 'effects' => [['type' => 27, 'value' => 3500]],
        ]]];
        $baseSkill = ['id' => 203381, 'enname' => 'Base Skill', 'rarity' => 2];
        $nextSkill = $evolvedSkill;
        switch ($degradation) {
            case 'base_skill':
                $next['evolutions'][0]['old'] = 0;
                break;
            case 'empty_conditions':
                $next['evolutions'][0]['conditions'] = [];
                break;
            case 'missing_conditions':
                unset($next['evolutions'][0]['conditions']);
                break;
            case 'skill_effect':
                $nextSkill['condition_groups'][0]['effects'] = [];
                break;
            case 'effect_value':
                unset($nextSkill['condition_groups'][0]['effects'][0]['value']);
                break;
        }
        $validChange = $evolution;
        $validChange['evolutions'][0]['conditions'] = [[['stat', 3, 900]]];
        $this->fakeGameTora([], [
            GameToraSyncService::MANIFEST_URL => function () use (&$activeManifest) {
                return Http::response($activeManifest);
            },
            GameToraSyncService::DATA_BASE_URL.'/character-cards.cards.json' => function () use (&$title) {
                return Http::response([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => $title]]);
            },
            GameToraSyncService::DATA_BASE_URL.'/skills.first.json' => Http::response([$baseSkill, $evolvedSkill]),
            GameToraSyncService::DATA_BASE_URL.'/skills.next.json' => Http::sequence()->push([$baseSkill, $nextSkill])->push([$baseSkill, $evolvedSkill]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.first.json' => Http::response([$evolution]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.next.json' => Http::sequence()->push([$next])->push([$validChange]),
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $before = [$old->refresh()->getAttributes(), $alias->refresh()->getAttributes()];
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $activeManifest = $manifest + ['skills' => 'next', 'evolutions' => 'next'];
        $title = 'New Title';
        DB::enableQueryLog();
        DB::flushQueryLog();

        $this->postJson('/api/gacha/sync-gametora', ['allow_evolution_removals' => true])->assertInternalServerError();

        $writes = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^\s*(insert|update|delete|replace)\b/i', $query['query']));
        DB::disableQueryLog();
        $this->assertSame([], $writes);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($before, [$old->refresh()->getAttributes(), $alias->refresh()->getAttributes()]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame([['Have at least 900 Power']], $alias->refresh()->skills['evolve'][0]['evolution_conditions']);
        $this->assertSame($alias->skills['evolve'], $old->refresh()->skills['evolve']);
    }

    #[TestWith(['stat_missing'])]
    #[TestWith(['stat_null'])]
    #[TestWith(['effects_missing'])]
    #[TestWith(['effects_null'])]
    #[TestWith(['self_evolution'])]
    #[TestWith(['servers_string'])]
    public function test_adversarial_evolution_rejects_invalid_schema_and_retries_corrected_revision(string $defect): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Archive]');
        $archive = $owner->catalogItem()->firstOrFail();
        $current = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $initial = $this->evolutionRow();
        $broken = $corrected = $initial;
        $skill = ['id' => 100903211, 'enname' => 'Scarlet Gale', 'rarity' => 6, 'condition_groups' => [
            ['condition' => 'distance_rate>=50', 'base_time' => 30000, 'effects' => [['type' => 27, 'value' => 3500]]],
            ['condition' => 'distance_rate>=70', 'base_time' => 40000, 'effects' => [['type' => 27, 'value' => 1000]]],
        ]];
        $base = ['id' => 203381, 'enname' => 'Base Skill'];
        $brokenSkill = $correctedSkill = $skill;
        switch ($defect) {
            case 'stat_missing':
                $broken['evolutions'][0]['conditions'] = [[['stat', 3]]];
                $corrected['evolutions'][0]['conditions'] = [[['stat', 3, 0]]];
                break;
            case 'stat_null':
                $broken['evolutions'][0]['conditions'] = [[['stat', 3, null]]];
                break;
            case 'effects_missing':
                unset($brokenSkill['condition_groups'][1]['effects']);
                $correctedSkill['condition_groups'][1]['effects'] = [];
                break;
            case 'effects_null':
                $brokenSkill['condition_groups'][1]['effects'] = null;
                break;
            case 'self_evolution':
                $broken['evolutions'][0]['old'] = 100903211;
                break;
            case 'servers_string':
                $broken['evolutions'][0]['servers'] = 'ja';
                break;
        }
        $manifest = ['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports'];
        $revision = 'original';
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']], [
            GameToraSyncService::MANIFEST_URL => function () use ($manifest, &$revision) {
                return Http::response($manifest + ['skills' => $revision, 'evolutions' => $revision]);
            },
            GameToraSyncService::DATA_BASE_URL.'/evolutions.original.json' => Http::response([$initial]),
            GameToraSyncService::DATA_BASE_URL.'/skills.original.json' => Http::response([$base, $skill]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.next.json' => Http::sequence()->push([$broken])->push([$corrected]),
            GameToraSyncService::DATA_BASE_URL.'/skills.next.json' => Http::sequence()->push([$base, $brokenSkill])->push([$base, $correctedSkill]),
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $before = [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()];
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $this->assertSame([['Have at least 800 Power']], $archive->skills['evolve'][0]['evolution_conditions']);
        $this->assertCount(2, $current->skills['evolve'][0]['effects']);
        $revision = 'next';

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $failure = $this->postJson('/api/gacha/sync-gametora');
            $writes = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^\s*(insert|update|delete|replace)\b/i', $query['query']));
        } finally {
            DB::disableQueryLog();
        }
        $failure->assertInternalServerError()->assertJsonPath('success', false)->assertJsonPath('is_up_to_date', false);
        $this->assertSame([], $writes);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($before, [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $expectedStat = $defect === 'stat_missing' ? 0 : 800;
        $evolved = $current->refresh()->skills['evolve'][0];
        $this->assertSame([["Have at least {$expectedStat} Power"]], $evolved['evolution_conditions']);
        $this->assertSame(203381, $evolved['base_skill_id']);
        $this->assertSame($correctedSkill['condition_groups'][1]['effects'] === [], $evolved['condition_groups'][1]['effects'] === []);
        $this->assertSame($current->skills['evolve'], $archive->refresh()->skills['evolve']);
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    #[TestWith([false])]
    #[TestWith([true])]
    #[TestWith([false, true])]
    #[TestWith([true, true])]
    public function test_conflicting_duplicate_evolution_is_rejected_in_either_order(bool $reverse, bool $bothWellFormed = false): void
    {
        $valid = $this->evolutionRow();
        $damaged = $valid;
        $damaged['evolutions'][0]['old'] = $bothWellFormed ? 203381 : 0;
        $damaged['evolutions'][0]['conditions'] = $bothWellFormed ? [[['stat', 3, 900]]] : [];
        $manifest = ['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports', 'skills' => 'skills'];
        $activeManifest = $manifest + ['evolutions' => 'first'];
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet']], $this->evolutionFixtures($valid) + [
            GameToraSyncService::MANIFEST_URL => function () use (&$activeManifest) {
                return Http::response($activeManifest);
            },
            GameToraSyncService::DATA_BASE_URL.'/evolutions.duplicate.json' => Http::response($reverse ? [$damaged, $valid] : [$valid, $damaged]),
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $card = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $before = $card->skills['evolve'];
        $hash = AppSetting::getValue('gametora_manifest_hash');

        $activeManifest = $manifest + ['evolutions' => 'duplicate'];
        $failure = $this->postJson('/api/gacha/sync-gametora')->assertInternalServerError()
            ->assertJsonPath('success', false)->assertJsonPath('is_up_to_date', false);
        if ($bothWellFormed) {
            $this->assertStringContainsString('relasi yang bertentangan', $failure->json('message'));
        }
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($before, $card->refresh()->skills['evolve']);
    }

    #[TestWith(['identical'])]
    #[TestWith(['reordered_keys'])]
    #[TestWith(['numeric_id_strings'])]
    #[TestWith(['servers_set'])]
    public function test_duplicate_evolution_with_equivalent_representation_is_deduplicated(string $variant): void
    {
        $first = $this->evolutionRow();
        $first['evolutions'][0]['metadata'] = ['a' => 1, 'b' => ['c' => 2, 'd' => 3]];
        $duplicate = $first;
        if ($variant === 'reordered_keys') {
            $duplicate['evolutions'][0] = array_reverse($duplicate['evolutions'][0], true);
            $duplicate['evolutions'][0]['metadata'] = ['b' => ['d' => 3, 'c' => 2], 'a' => 1];
        } elseif ($variant === 'numeric_id_strings') {
            $duplicate['evolutions'][0]['new'] = '100903211';
            $duplicate['evolutions'][0]['old'] = '203381';
        } elseif ($variant === 'servers_set') {
            $first['evolutions'][0]['servers'] = ['ja', 'en'];
            $duplicate['evolutions'][0]['servers'] = ['en', 'ja'];
        }
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet']], [
            GameToraSyncService::MANIFEST_URL => Http::response([
                'characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports', 'skills' => 'skills', 'evolutions' => 'first',
            ]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.first.json' => Http::response([$first, $duplicate]),
        ] + $this->evolutionFixtures($first));

        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $card = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->assertSame([100903211], array_column($card->raw_data['skills_evo'], 'new'));
        $this->assertSame([203381], array_column($card->skills['evolve'], 'base_skill_id'));
        $this->assertSame([['Have at least 800 Power']], $card->skills['evolve'][0]['evolution_conditions']);
        $this->assertNotNull(AppSetting::getValue('gametora_manifest_hash'));
    }

    #[TestWith([['fan', 300000], ['fan', 'damaged']])]
    #[TestWith([['fan', 300000], ['fan']])]
    #[TestWith([['fan', 300000], ['fan', null]])]
    #[TestWith([['fan', 300000], ['fan', '30e2']])]
    #[TestWith([['race_pn', 1001, 3], ['race_pn', 'damaged', 3]])]
    #[TestWith([['e_skill', 'speed', 3], ['e_skill', 'speed', 'damaged']])]
    #[TestWith([['rt_race_w', 10001, 2], ['rt_race_w', 10001, ['damaged']]])]
    #[TestWith([['ev_cn_on', 501002524, 0, 2], ['ev_cn_on', 501002524, 0]])]
    #[TestWith([['ev_ac_on', 501016524, [2, 3, 4], 2], ['ev_ac_on', 501016524, ['damaged'], 2]])]
    #[TestWith([['ev', 501004515], ['ev', 0]])]
    #[TestWith([['ev', 501004515], ['unknown_evolution_operator', 501004515]])]
    #[TestWith([
        ['ev_ac_on', 501016524, [2, 3, 4], 2],
        ['ev_ac_on', 'damaged-id', [true], 2],
        ['ev_ac_on', 501016524, [2, 3, 4], 1],
        'Trigger the 「501016524」 training event',
    ], 'corrupt event and corrected same manifest')]
    public function test_pass_five_operand_domains_reject_malformed_tuples_before_publication(
        array $valid,
        array $invalid,
        array $correctedTuple = ['fan', 0],
        string $correctedText = 'Have at least 0 fans',
    ): void {
        $archive = $this->ownedCharacter('Daiwa Scarlet [Archive]')->catalogItem()->firstOrFail();
        $current = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $initial = $damaged = $corrected = $this->evolutionRow();
        $initial['evolutions'][0]['conditions'] = [[$valid]];
        $damaged['evolutions'][0]['conditions'] = [[$invalid]];
        $corrected['evolutions'][0]['conditions'] = [[$correctedTuple]];
        $revision = 'first';
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']], [
            GameToraSyncService::MANIFEST_URL => function () use (&$revision) {
                return Http::response(['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports',
                    'skills' => 'skills', 'evolutions' => $revision]);
            },
            GameToraSyncService::DATA_BASE_URL.'/evolutions.first.json' => Http::response([$initial]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.next.json' => Http::sequence()->push([$damaged])->push([$corrected]),
        ] + $this->evolutionFixtures($initial));
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $before = [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()];
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $revision = 'next';

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $failure = $this->postJson('/api/gacha/sync-gametora');
            $writes = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^\s*(insert|update|delete|replace)\b/i', $query['query']));
        } finally {
            DB::disableQueryLog();
        }
        $failure->assertInternalServerError()->assertJsonPath('success', false);
        $this->assertSame([], $writes);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($before, [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame([[$correctedText]], $current->refresh()->skills['evolve'][0]['evolution_conditions']);
        $this->assertSame([[$correctedTuple]], $current->raw_data['skills_evo'][0]['conditions']);
        $this->assertSame($current->skills['evolve'], $archive->refresh()->skills['evolve']);
    }

    public function test_live_silence_suzuka_evolution_accepts_numeric_event_requirement(): void
    {
        $relation = [
            'old' => 200024,
            'new' => 100201311,
            'servers' => ['ja'],
            'conditions' => [[['ev_cn_on', 501002524, 0, 2], ['fan', 150000]], [['stat', 4, 600]]],
        ];
        $evolution = ['card_id' => 100201, 'evolutions' => [$relation]];
        $this->fakeGameTora([['card_id' => 100201, 'name_en' => 'Silence Suzuka', 'title_en' => 'Original']], [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'skills' => 'skills', 'evolutions' => 'first']),
            GameToraSyncService::DATA_BASE_URL.'/skills.skills.json' => Http::response([
                ['id' => 200024, 'rarity' => 2],
                ['id' => 100201311, 'rarity' => 6],
            ]),
        ] + $this->evolutionFixtures($evolution));

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $character = UmaCatalogItem::where('gametora_id', 100201)->sole();
        $this->assertSame($relation['conditions'], $character->raw_data['skills_evo'][0]['conditions']);
        $skill = $character->skills['evolve'][0];
        $this->assertSame(100201311, $skill['id']);
        $this->assertSame(200024, $skill['base_skill_id']);
        $this->assertSame([['Trigger the 「501002524」 training event', 'Have at least 150,000 fans'], ['Have at least 600 Guts']], $skill['evolution_conditions']);
    }

    public function test_live_evolution_event_shapes_are_supported_across_cards(): void
    {
        $evolution = $this->evolutionRow();
        $conditions = [[
            ['ev', 501004515],
            ['ev_trc_t', 501037524, 1],
            ['evn', 501040524, 1],
            ['p_ev_s', 501046525],
            ['mo_ev', 4, 501060801],
            ['ev_ac_on', 501016524, [2, 3, 4], 2],
            ['ev_mo_up', 3],
            ['race_place', 101101, [1, 2]],
            ['scen_shuntaisai_pa'],
        ]];
        $evolution['evolutions'][0]['conditions'] = $conditions;
        $this->fakeGameToraEvolution($evolution);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $card = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->assertSame($conditions, $card->raw_data['skills_evo'][0]['conditions']);
        $this->assertCount(6, $card->skills['evolve'][0]['evolution_conditions'][0]);
    }

    public function test_live_special_week_evolution_accepts_graded_race_requirement(): void
    {
        $evolution = ['card_id' => 100102, 'evolutions' => [[
            'conditions' => [[['s_gn_race_w', 3, 'g', 2]], [['stat', 2, 600]]],
            'servers' => ['ja', 'ko', 'zh_tw'],
            'old' => 200591,
            'new' => 100102111,
        ]]];
        $this->fakeGameTora([['card_id' => 100102, 'name_en' => 'Special Week', 'title_en' => "Hopp'n♪Happy Heart"]], [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'skills' => 'skills', 'evolutions' => 'first']),
            GameToraSyncService::DATA_BASE_URL.'/skills.skills.json' => Http::response([
                ['id' => 200591, 'enname' => 'Fast & Furious', 'rarity' => 2],
                ['id' => 100102111, 'enname' => "Sunshine 'n' Spirit!", 'rarity' => 6],
            ]),
        ] + $this->evolutionFixtures($evolution));

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);

        $character = UmaCatalogItem::where('gametora_id', 100102)->sole();
        $skill = $character->skills['evolve'][0];
        $this->assertSame(100102111, $skill['id']);
        $this->assertSame(200591, $skill['base_skill_id']);
        $this->assertSame([['Win 2 graded races as Betweener'], ['Have at least 600 Stamina']], $skill['evolution_conditions']);
        $this->assertNotEmpty(AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
    }

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_sync_canonicalizes_legacy_oguri_banner_without_losing_history(bool $historyOnBoth): void
    {
        $legacy = GachaBanner::whereNull('gametora_id')
            ->where('name', '新衣装Oguri Cap登場! Premium Pretty Derby Gacha')->sole();
        $lineup = ['Oguri Cap [Cinderella Gray]'];
        $canonical = GachaBanner::create([
            'gametora_id' => 30394, 'banner_type' => 'character', 'category' => 'premium', 'base_rate' => 4.5,
            'name' => '新衣装Oguri Cap登場! Premium Pretty Derby Gacha: Oguri Cap [Cinderella Gray]',
            'featured_items' => $lineup, 'start_date' => '2025-12-11', 'end_date' => '2026-01-08',
        ]);
        $pull = GachaPull::create([
            'gacha_banner_id' => $legacy->id, 'banner_type' => 'character', 'pull_type' => 'single',
            'item_name' => $lineup[0], 'rarity' => 'SSR', 'is_rate_up' => true, 'pity_count_at_pull' => 32,
            'pulled_at' => '2025-12-15 12:00:00',
        ]);
        $pity = GachaPity::create([
            'gacha_banner_id' => $legacy->id, 'banner_type' => 'character', 'current_pity' => 32,
            'last_reset_at' => '2025-12-14 12:00:00', 'total_sparks' => 1,
        ]);
        if ($historyOnBoth) {
            GachaPity::create(['gacha_banner_id' => $canonical->id, 'banner_type' => 'character', 'current_pity' => 12]);
        }

        $this->fakeGameTora([['card_id' => 100603, 'name_en' => 'Oguri Cap', 'title_en' => 'Cinderella Gray']], [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'gacha/char-standard' => 'banners']),
            GameToraSyncService::DATA_BASE_URL.'/gacha/char-standard.banners.json' => Http::response([
                ['id' => 30394, 'start' => 1765422000, 'end' => 1767841199, 'pickups' => [[100603, 7500, true]]],
            ]),
        ]);

        foreach ([false, true] as $cached) {
            $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', $cached);
            $sameBannerRows = GachaBanner::where('banner_type', 'character')->where('category', 'premium')
                ->whereDate('start_date', '2025-12-11')->orderBy('id')->pluck('id')->all();
            $this->assertSame($historyOnBoth ? [$legacy->id, $canonical->id] : [$canonical->id], $sameBannerRows);
            $this->assertSame(30394, $canonical->refresh()->gametora_id);
            $this->assertSame($historyOnBoth ? $legacy->id : $canonical->id, $pull->refresh()->gacha_banner_id);
            $this->assertSame(32, $pull->pity_count_at_pull);
            $this->assertSame($pull->gacha_banner_id, $pity->refresh()->gacha_banner_id);
            $this->assertSame(32, $pity->current_pity);
            $this->assertSame(1, $pity->total_sparks);
            $this->assertSame('2025-12-14 12:00:00', $pity->last_reset_at->toDateTimeString());
            if ($historyOnBoth) {
                $this->assertDatabaseHas('gacha_pities', ['gacha_banner_id' => $canonical->id, 'current_pity' => 12]);
            }
            $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
        }
    }

    public function test_unresolved_pickup_placeholder_remains_in_history_and_backup_after_sync(): void
    {
        $placeholder = GachaBanner::create([
            'gametora_id' => 30434, 'banner_type' => 'character', 'category' => 'standard', 'base_rate' => 3.0,
            'name' => 'Pretty Derby Gacha: Pickup Character', 'featured_items' => [],
            'start_date' => '2026-04-30', 'end_date' => '2026-05-11',
        ]);
        $pull = GachaPull::create([
            'gacha_banner_id' => $placeholder->id, 'banner_type' => 'character', 'pull_type' => 'single',
            'item_name' => 'Daiwa Scarlet', 'rarity' => 'SR', 'is_rate_up' => false, 'pity_count_at_pull' => 1,
            'pulled_at' => '2026-05-01 12:00:00',
        ]);
        GachaPity::create(['gacha_banner_id' => $placeholder->id, 'banner_type' => 'character', 'current_pity' => 1]);
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet']], [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'gacha/char-standard' => 'banners']),
            GameToraSyncService::DATA_BASE_URL.'/gacha/char-standard.banners.json' => Http::response([
                ['id' => 30434, 'start' => 1777518000, 'end' => 1778468399,
                    'pickups' => [], 'lineup' => [3333 => [100903]]],
            ]),
        ]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $this->assertSame([], $placeholder->refresh()->featured_items);
        $this->getJson('/api/gacha/pulls?gacha_banner_id='.$placeholder->id)->assertOk()
            ->assertJsonPath('data.0.id', $pull->id)
            ->assertJsonPath('data.0.banner.id', $placeholder->id)
            ->assertJsonPath('data.0.is_rate_up', false);
        $backup = $this->getJson('/api/backup/export')->assertOk()->json('data');
        $this->assertSame(30434, array_column($backup['gacha_banners'], 'gametora_id', 'id')[$placeholder->id]);
        $this->assertSame($placeholder->id, array_column($backup['gacha_pulls'], 'gacha_banner_id', 'id')[$pull->id]);
        $this->assertContains($placeholder->id, array_column($backup['gacha_pities'], 'gacha_banner_id'));
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_live_race_grade_domain_accepts_graded_token_on_same_manifest_retry(): void
    {
        $valid = $invalid = $this->evolutionRow();
        $valid['evolutions'][0]['conditions'] = [[
            ['dt_gn_race_w', 'dist', 1, 'g', 3],
            ['gn_race_w', 'g', 2],
            ['s_gn_race_w', 1, '100', 1],
        ]];
        $invalid['evolutions'][0]['conditions'] = [[['gn_race_w', 'unknown', 2]]];
        $this->fakeGameToraEvolution($valid, [
            GameToraSyncService::DATA_BASE_URL.'/evolutions.first.json' => Http::sequence()->push([$invalid])->push([$valid]),
        ]);

        $this->postJson('/api/gacha/sync-gametora')->assertInternalServerError()->assertJsonPath('success', false);
        $this->assertNull(AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
        $this->assertDatabaseMissing('uma_catalog_items', ['gametora_id' => 100903]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $skill = UmaCatalogItem::where('gametora_id', 100903)->sole()->skills['evolve'][0];
        $this->assertSame([[
            'Win 3 graded Mile races',
            'Win 2 graded races',
            'Win any G1 race as Runner',
        ]], $skill['evolution_conditions']);
        $this->assertNotEmpty(AppSetting::getValue(GameToraSyncService::MANIFEST_CHECKPOINT_KEY));
    }

    public function test_pass_five_valid_numeric_string_uses_integer_operand_semantics(): void
    {
        $evolution = $this->evolutionRow();
        $evolution['evolutions'][0]['conditions'] = [[['fan', '300000']]];
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet']], [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'skills' => 'skills', 'evolutions' => 'first']),
        ] + $this->evolutionFixtures($evolution));

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->assertSame([['Have at least 300,000 fans']], UmaCatalogItem::where('gametora_id', 100903)->sole()->skills['evolve'][0]['evolution_conditions']);
    }

    #[TestWith(['self', false])]
    #[TestWith(['two', false])]
    #[TestWith(['two', true])]
    #[TestWith(['three', false])]
    #[TestWith(['three', true])]
    #[TestWith(['mixed', true])]
    #[TestWith(['alias_split', false])]
    public function test_pass_five_cyclic_evolution_graph_rejects_whole_revision_before_writes(string $cycle, bool $reverse): void
    {
        $archive = $this->ownedCharacter('Daiwa Scarlet [Archive]')->catalogItem()->firstOrFail();
        $current = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $forward = [100903, 203381, 100903211];
        $second = [102902, 100903211, 102902211];
        $edges = match ($cycle) {
            'self' => [[100903, 100903211, 100903211]],
            'two' => [$forward, [100903, 100903211, 203381]],
            'three' => [$forward, $second, [102902, 102902211, 203381]],
            'mixed' => [$forward, $second, [102902, 102902211, 203381], [103001, 305001, 305002]],
            'alias_split' => [$forward, $forward, [102902, 100903211, 203381]],
        };
        if ($reverse) {
            $edges = array_reverse($edges);
        }
        $revision = 'first';
        $this->fakeEvolutionGraph($revision, [$forward], $edges, [$forward, $second]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $before = [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()];
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $revision = 'next';

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $failure = $this->postJson('/api/gacha/sync-gametora');
            $writes = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^\s*(insert|update|delete|replace)\b/i', $query['query']));
        } finally {
            DB::disableQueryLog();
        }
        $failure->assertInternalServerError()->assertJsonPath('success', false)->assertJsonPath('is_up_to_date', false);
        $this->assertSame([], $writes);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($before, [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($archive->refresh()->skills['evolve'], $current->refresh()->skills['evolve']);
        $this->assertSame(100903211, UmaCatalogItem::where('gametora_id', 102902)->sole()->skills['evolve'][0]['base_skill_id']);
    }

    #[TestWith([false, false])]
    #[TestWith([false, true])]
    #[TestWith([true, false])]
    #[TestWith([true, true])]
    public function test_pass_five_valid_evolution_graph_acceptance_is_independent_of_edge_order(bool $disconnected, bool $reverse): void
    {
        $edges = $disconnected
            ? [[100903, 203381, 100903211], [102902, 305001, 305002]]
            : [[100903, 203381, 100903211], [102902, 100903211, 102902211], [100903, 203381, 102902211]];
        $revision = 'first';
        $this->fakeEvolutionGraph($revision, $reverse ? array_reverse($edges) : $edges, [], []);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $actual = [];
        foreach (UmaCatalogItem::characterCatalog()->get() as $card) {
            foreach ($card->raw_data['skills_evo'] as $evolution) {
                $actual[] = [$card->gametora_id, $evolution['old'], $evolution['new']];
            }
        }
        $this->assertEqualsCanonicalizing($edges, $actual);
    }

    private function fakeEvolutionGraph(string &$revision, array $initial, array $next, array $corrected): void
    {
        $asRows = fn (array $edges) => array_map(fn (array $edge) => ['card_id' => $edge[0], 'evolutions' => [
            ['old' => $edge[1], 'new' => $edge[2], 'servers' => ['ja'], 'conditions' => [[['fan', 300000]]]],
        ]], $edges);
        $this->fakeGameTora([
            ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
            ['card_id' => 102902, 'name_en' => 'Super Creek'],
            ['card_id' => 103001, 'name_en' => 'Special Week'],
        ], [
            GameToraSyncService::MANIFEST_URL => function () use (&$revision) {
                return Http::response(['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports',
                    'skills' => 'skills', 'evolutions' => $revision]);
            },
            GameToraSyncService::DATA_BASE_URL.'/skills.skills.json' => Http::response(array_map(
                fn (int $id) => ['id' => $id, 'enname' => "Skill {$id}"],
                [203381, 100903211, 102902211, 305001, 305002]
            )),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.first.json' => Http::response($asRows($initial)),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.next.json' => Http::sequence()->push($asRows($next))->push($asRows($corrected)),
        ]);
    }

    #[TestWith(['all', false])]
    #[TestWith(['all', true])]
    #[TestWith(['partial', false])]
    #[TestWith(['partial', true])]
    #[TestWith(['partial', true, true])]
    #[TestWith(['rotation', false])]
    #[TestWith(['rotation', true])]
    public function test_pass_five_relocation_plans_all_physical_names_before_import(string $scenario, bool $reverse, bool $ownsArchive = false): void
    {
        $owner = $this->ownedCharacter('Daiwa Scarlet [Current]');
        $primary = $owner->catalogItem()->firstOrFail();
        $archive = UmaCatalogItem::create([
            'type' => 'character', 'name' => 'Daiwa Scarlet [Archive]', 'gametora_id' => 100903,
            'raw_data' => ['_previous_catalog_names' => ['Daiwa Scarlet [Earlier]']],
            'skills' => ['evolve' => [['id' => 100903211, 'name_en' => 'Scarlet Gale']]],
        ]);
        $archiveId = $archive->id;
        if ($ownsArchive) {
            $owner->update(['uma_catalog_item_id' => $archiveId, 'name' => $archive->name]);
        }
        $mainTitle = $scenario === 'all' ? 'Next' : 'Current';
        if ($scenario === 'rotation') {
            $mainTitle = 'Second';
            foreach ([100904 => 'Second', 100905 => 'Third'] as $id => $title) {
                UmaCatalogItem::create(['type' => 'character', 'name' => "Daiwa Scarlet [{$title}]", 'gametora_id' => $id]);
            }
        }
        $destinations = match ($scenario) {
            'all' => [100903 => $mainTitle, 100904 => 'Archive', 100905 => 'Current'],
            'partial' => [100903 => $mainTitle, 100904 => 'Archive'],
            'rotation' => [100903 => $mainTitle, 100904 => 'Third', 100905 => 'Current'],
        };
        $items = [];
        foreach ($destinations as $id => $title) {
            $items[] = ['id' => $id, 'type' => 'character', 'name' => "Daiwa Scarlet [{$title}]", 'gametora_id' => $id];
        }
        $payload = ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => $reverse ? array_reverse($items) : $items,
        ]]];
        $this->postJson('/api/backup/import', $payload)->assertOk()->assertJsonPath('conflicts', []);
        $snapshot = UmaCatalogItem::characterCatalog()->orderBy('id')->get()->toArray();
        $this->travel(1)->minutes();
        $this->postJson('/api/backup/import', $payload)->assertOk()->assertJsonPath('conflicts', []);
        $this->assertSame($snapshot, UmaCatalogItem::characterCatalog()->orderBy('id')->get()->toArray());

        foreach ($items as $item) {
            $this->assertDatabaseHas('uma_catalog_items', ['type' => 'character', 'name' => $item['name'], 'gametora_id' => $item['gametora_id']]);
        }
        $this->assertSame("Daiwa Scarlet [{$mainTitle}]", $primary->refresh()->name);
        $this->assertDatabaseHas('uma_catalog_items', ['id' => $archiveId, 'gametora_id' => 100903]);
        $this->assertDatabaseHas('user_characters', ['id' => $owner->id, 'uma_catalog_item_id' => $ownsArchive ? $archiveId : $primary->id, 'is_owned' => true, 'current_stars' => 5]);
        if ($scenario !== 'rotation') {
            $this->assertContains('Daiwa Scarlet [Archive]', $primary->raw_data['_previous_catalog_names']);
            $this->assertContains('Daiwa Scarlet [Earlier]', $primary->raw_data['_previous_catalog_names']);
            $this->getJson('/api/collection/characters/detail?id='.$archiveId)->assertOk()
                ->assertJsonPath('character.name', $primary->name)->assertJsonPath('character.current_stars', 5);
            $this->getJson('/api/collection/skill-sources?q=Scarlet%20Gale&rarity=evolved&owned_only=1')->assertOk()
                ->assertJsonPath('skills.0.characters.0.name', $primary->name)
                ->assertJsonPath('skills.0.characters.0.current_stars', 5);
        }
        $this->getJson('/api/collection/characters')->assertOk()->assertJsonPath('stats.total_owned', 1)->assertJsonCount(count($items), 'characters');
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    #[TestWith(['sparse'])]
    #[TestWith(['nested'])]
    #[TestWith(['null'])]
    #[TestWith(['empty'])]
    #[TestWith(['value'])]
    public function test_pass_five_backup_merge_respects_presence_of_evolution_fields_and_checkpoint(string $variant): void
    {
        $archive = $this->ownedCharacter('Daiwa Scarlet [Archive]')->catalogItem()->firstOrFail();
        $current = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $evolution = $this->evolutionRow();
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']], [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'skills' => 'skills', 'evolutions' => 'first']),
            GameToraSyncService::DATA_BASE_URL.'/skills.skills.json' => Http::response([
                ['id' => 203381, 'enname' => 'Base Skill'],
                ['id' => 100903211, 'enname' => 'Scarlet Gale', 'condition_groups' => [
                    ['condition' => 'distance_rate>=50', 'base_time' => 30000, 'effects' => [['type' => 27, 'value' => 3500]]],
                ]],
            ]),
        ] + $this->evolutionFixtures($evolution));
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $rich = $current->refresh()->skills['evolve'][0];
        $archiveBefore = $archive->refresh()->getAttributes();
        if ($variant === 'nested') {
            $rich['metadata'] = ['label' => 'Old', 'extra' => ['retained' => 1, 'changed' => 2]];
            $skills = $current->skills;
            $skills['evolve'][0] = $rich;
            $current->update(['skills' => $skills]);
        }
        $incoming = ['id' => 100903211, 'name_en' => 'Scarlet Gale'];
        $expected = $rich;
        if ($variant === 'nested') {
            $incoming['metadata'] = ['extra' => ['changed' => 3]];
            $expected['metadata']['extra']['changed'] = 3;
        } elseif ($variant !== 'sparse') {
            $incoming['conditions'] = match ($variant) {
                'null' => null,
                'empty' => [],
                'value' => [['Have at least 900 Power']],
            };
            $expected['conditions'] = $incoming['conditions'];
        }
        $payload = ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => [['type' => 'character', 'name' => $current->name, 'gametora_id' => 100903,
                'skills' => ['evolve' => [$incoming]]]],
        ]]];

        $this->postJson('/api/backup/import', $payload)->assertOk();
        $this->assertEquals($expected, $current->refresh()->skills['evolve'][0]);
        $this->assertSame($archiveBefore, $archive->refresh()->getAttributes());
        $merged = $current->getAttributes();
        $this->travel(1)->minutes();
        $this->postJson('/api/backup/import', $payload)->assertOk();
        $this->assertSame($merged, $current->refresh()->getAttributes());

        $semanticChange = in_array($variant, ['null', 'empty', 'value'], true);
        $this->assertSame($semanticChange ? null : $hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', ! $semanticChange);
        $this->assertEquals($semanticChange ? $rich : $expected, $current->refresh()->skills['evolve'][0]);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
    }

    #[TestWith([['a_skill', 'dist', 0, 2], 'Short aptitude'])]
    #[TestWith([['a_skill', 1, 4, 2], 'Dirt aptitude'])]
    #[TestWith([['a_skill', 'strat', 1, 2], 'Runner aptitude'])]
    #[TestWith([['a_skill', 2, 4, 2], 'Chaser aptitude'])]
    #[TestWith([['a_skill', 'trn', 1, 2], 'Turf aptitude'])]
    #[TestWith([['a_skill', 0, 2, 2], 'Dirt aptitude'])]
    #[TestWith([['dt_race_w', 'trn', 1], 'Turf race'])]
    #[TestWith([['dt_gn_race_w', 'trn', 1, 100], 'G1 Turf race'])]
    #[TestWith([['s_fn_dt_gn_race_w', 4, 1, null, 0, 100], 'Short race as Chaser'])]
    public function test_final_aptitude_accepts_supported_codes_and_formats_their_labels(array $condition, string $label): void
    {
        $evolution = $this->evolutionRow();
        $evolution['evolutions'][0]['conditions'] = [[$condition]];
        $this->fakeGameToraEvolution($evolution);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $evolvedSkill = UmaCatalogItem::where('gametora_id', 100903)->sole()->skills['evolve'][0];
        $this->assertStringContainsString($label, $evolvedSkill['evolution_conditions'][0][0]);
    }

    #[TestWith([['a_skill', 'dist', 99, 2]])]
    #[TestWith([['a_skill', 'dist', -1, 2]])]
    #[TestWith([['a_skill', 'dist', 5, 2]])]
    #[TestWith([['a_skill', 'dist', PHP_INT_MAX, 2]])]
    #[TestWith([['a_skill', 'dist', null, 2]])]
    #[TestWith([['a_skill', 'dist', 'missing', 2]])]
    #[TestWith([['a_skill', 'strat', -1, 2]])]
    #[TestWith([['a_skill', 'strat', 0, 2]])]
    #[TestWith([['a_skill', 'strat', 5, 2]])]
    #[TestWith([['a_skill', 'strat', PHP_INT_MAX, 2]])]
    #[TestWith([['a_skill', 'strat', null, 2]])]
    #[TestWith([['a_skill', 'strat', 'missing', 2]])]
    #[TestWith([['a_skill', 'trn', -1, 2]])]
    #[TestWith([['a_skill', 'trn', 0, 2]])]
    #[TestWith([['a_skill', 'trn', 3, 2]])]
    #[TestWith([['a_skill', 'trn', PHP_INT_MAX, 2]])]
    #[TestWith([['a_skill', 'trn', null, 2]])]
    #[TestWith([['a_skill', 'trn', 'missing', 2]])]
    #[TestWith([['a_skill', 'dist', 1, 'missing']])]
    #[TestWith([['a_skill', 'missing', 1, 2]])]
    #[TestWith([['dt_race_w', 'trn', 3]])]
    #[TestWith([['dt_gn_race_w', 'dist', 5, 100]])]
    #[TestWith([['s_gn_race_w', 5, 100]])]
    #[TestWith([['s_gn2_race_w', 5, 100, 200]])]
    #[TestWith([['s_fn_gn_race_w', 5, 1, 100]])]
    #[TestWith([['s_fn_dt_gn_race_w', 5, 1, null, 1, 100]])]
    #[TestWith([['s_fn_dt_gn_race_w', 1, 1, null, 5, 100]])]
    #[TestWith([['s_dt_gn_race_w', 5, null, 1, 100]])]
    #[TestWith([['s_dt_gn_race_w', 1, null, 5, 100]])]
    public function test_final_aptitude_rejects_invalid_operands_without_writes_and_allows_ordinary_retry(array $condition): void
    {
        $archive = $this->ownedCharacter('Daiwa Scarlet [Archive]')->catalogItem()->firstOrFail();
        $current = UmaCatalogItem::create(['type' => 'character', 'name' => 'Daiwa Scarlet [Scarlet Gale]', 'gametora_id' => 100903]);
        $initial = $damaged = $this->evolutionRow();
        $initial['evolutions'][0]['conditions'] = [[['a_skill', 'dist', 1, 2]]];
        $damaged['evolutions'][0]['conditions'] = [[$condition]];
        $revision = 'first';
        $this->fakeGameToraEvolution($initial, [
            GameToraSyncService::MANIFEST_URL => function () use (&$revision) {
                return Http::response(['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports',
                    'skills' => 'skills', 'evolutions' => $revision]);
            },
            GameToraSyncService::DATA_BASE_URL.'/evolutions.next.json' => Http::sequence()->push([$damaged])->push([$initial]),
        ]);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $before = [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()];
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $expected = [['Get at least 2 skills for Mile aptitude']];
        $this->assertSame($expected, $current->skills['evolve'][0]['evolution_conditions']);
        $this->assertSame($expected, $archive->skills['evolve'][0]['evolution_conditions']);
        $revision = 'next';

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $failure = $this->postJson('/api/gacha/sync-gametora');
            $writes = array_filter(DB::getQueryLog(), fn (array $query) => preg_match('/^\s*(insert|update|delete|replace)\b/i', $query['query']));
        } finally {
            DB::disableQueryLog();
        }
        $after = [$archive->refresh()->getAttributes(), $current->refresh()->getAttributes()];
        $failedHash = AppSetting::getValue('gametora_manifest_hash');
        $published = [$archive->skills['evolve'][0]['evolution_conditions'], $current->skills['evolve'][0]['evolution_conditions']];
        $retry = $this->postJson('/api/gacha/sync-gametora');

        $this->assertSame(
            [500, 0, [$expected, $expected], $hash, false],
            [$failure->getStatusCode(), count($writes), $published, $failedHash, $retry->json('is_up_to_date')],
        );
        $failure->assertJsonPath('success', false);
        $this->assertSame($before, $after);
        $retry->assertOk();
        $this->assertNotSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame($expected, $current->refresh()->skills['evolve'][0]['evolution_conditions']);
        $this->assertSame($current->skills['evolve'], $archive->refresh()->skills['evolve']);
    }

    #[TestWith([2, 'merge'])]
    #[TestWith([3, 'merge'])]
    #[TestWith([2, 'overwrite'])]
    public function test_final_checkpoint_cannot_be_revived_by_reimporting_stale_backup(int $imports, string $lastMode): void
    {
        [$backup, $hash] = $this->exportGameToraEvolution();
        $entry = &$backup['data']['uma_catalog_items'][0]['skills']['evolve'][0];
        $entry['conditions'] = $entry['evolution_conditions'] = [['Have at least 900 Power']];
        $checkpoints = [];

        for ($index = 1; $index <= $imports; $index++) {
            $mode = $index === $imports ? $lastMode : 'merge';
            $this->postJson('/api/backup/import', ['mode' => $mode, 'data' => $backup])->assertOk();
            $character = UmaCatalogItem::where('gametora_id', 100903)->sole();
            $this->assertSame([['Have at least 900 Power']], $character->skills['evolve'][0]['evolution_conditions']);
            $checkpoints[] = AppSetting::getValue('gametora_manifest_hash');
        }
        $sync = $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->assertSame(
            [array_fill(0, $imports, null), false, [['Have at least 800 Power']]],
            [$checkpoints, $sync->json('is_up_to_date'), $character->refresh()->skills['evolve'][0]['evolution_conditions']],
        );
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
    }

    public function test_final_checkpoint_stays_invalid_after_export_and_merge_of_invalidated_state(): void
    {
        [$backup, $hash] = $this->exportGameToraEvolution();
        $entry = &$backup['data']['uma_catalog_items'][0]['skills']['evolve'][0];
        $entry['conditions'] = $entry['evolution_conditions'] = [['Have at least 900 Power']];
        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => $backup])->assertOk();
        $this->assertNull(AppSetting::getValue('gametora_manifest_hash'));
        $invalidated = $this->getJson('/api/backup/export')->assertOk()->json();
        $this->assertNotContains('gametora_manifest_hash', array_column($invalidated['data']['app_settings'], 'key'));

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => $invalidated])->assertOk();
        $this->assertNull(AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
    }

    public function test_final_checkpoint_unchanged_semantics_preserve_local_hash_and_restore_normal_settings(): void
    {
        [$backup, $hash] = $this->exportGameToraEvolution();
        foreach ($backup['data']['app_settings'] as &$setting) {
            if ($setting['key'] === 'gametora_manifest_hash') {
                $setting['value'] = 'different-backup-checkpoint';
            }
        }
        unset($setting);
        $backup['data']['app_settings'][] = ['key' => 'user_theme', 'value' => 'dark'];

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => $backup])->assertOk();

        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->assertSame('dark', AppSetting::getValue('user_theme'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    private function fakeGameToraEvolution(array $evolution, array $overrides = []): void
    {
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']], $overrides + [
            GameToraSyncService::MANIFEST_URL => Http::response(['characters' => 'bases', 'character-cards' => 'cards',
                'support-cards' => 'supports', 'skills' => 'skills', 'evolutions' => 'first']),
        ] + $this->evolutionFixtures($evolution));
    }

    /** @return array{array<string, mixed>, string} */
    private function exportGameToraEvolution(): array
    {
        $this->fakeGameToraEvolution($this->evolutionRow());
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $character = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->assertSame([['Have at least 800 Power']], $character->skills['evolve'][0]['evolution_conditions']);
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $this->assertIsString($hash);
        $backup = $this->getJson('/api/backup/export')->assertOk()->assertJsonPath('version', '2.0')->json();
        $this->assertSame($hash, array_column($backup['data']['app_settings'], 'value', 'key')['gametora_manifest_hash']);

        return [$backup, $hash];
    }

    public function test_catalog_checkpoint_historical_awakening_is_repaired_by_ordinary_sync(): void
    {
        $this->assertHistoricalCatalogImportReplaysSync(
            ['skills_awakening' => []],
            ['skills_awakening' => [203391]],
            fn (UmaCatalogItem $item) => array_column($item->skills['awakening'], 'id'),
            [],
            [203391],
        );
    }

    public function test_catalog_checkpoint_historical_title_is_repaired_by_ordinary_sync(): void
    {
        $this->assertHistoricalCatalogImportReplaysSync(
            ['title_en' => 'Former'],
            ['title_en' => 'Current'],
            fn (UmaCatalogItem $item) => [$item->name, $item->raw_data['title_en']],
            ['Daiwa Scarlet [Former]', 'Former'],
            ['Daiwa Scarlet [Current]', 'Current'],
        );
    }

    public function test_catalog_checkpoint_historical_rarity_is_repaired_by_ordinary_sync(): void
    {
        $this->assertHistoricalCatalogImportReplaysSync(
            ['rarity' => 2],
            ['rarity' => 3],
            fn (UmaCatalogItem $item) => $item->rarity,
            'SR',
            'SSR',
        );
    }

    public function test_catalog_checkpoint_control_identical_merge_ignores_storage_and_json_representation(): void
    {
        [$backup, $hash] = $this->exportGameToraEvolution();
        $row = &$backup['data']['uma_catalog_items'][0];
        $row['id'] += 1000;
        $row['raw_data'] = array_reverse($row['raw_data'], true);
        $row['raw_data']['_previous_catalog_names'] = ['Daiwa Scarlet [Stored Alias]'];
        $row['raw_data']['id'] = $row['raw_data']['card_id'];
        unset($row['raw_data']['card_id']);
        $row['skills']['evolve'][0] = array_reverse($row['skills']['evolve'][0], true);

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => $backup])->assertOk();

        $character = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->assertNotSame($row['id'], $character->id);
        $this->assertContains('Daiwa Scarlet [Stored Alias]', UmaCatalogItem::characterNameHistory($character->raw_data));
        $this->assertSame('', $character->skills['evolve'][0]['description']);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    public function test_catalog_checkpoint_control_ownership_only_merge_preserves_checkpoint(): void
    {
        [, $hash] = $this->exportGameToraEvolution();
        $character = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'user_characters' => [[
                'name' => $character->name, 'gametora_id' => 100903, 'is_owned' => true,
                'base_stars' => 3, 'current_stars' => 5, 'notes' => 'Backup koleksi', 'obtained_at' => '2026-10-25',
            ]],
        ]]])->assertOk();

        $owner = UserCharacter::where('uma_catalog_item_id', $character->id)->sole();
        $this->assertTrue($owner->is_owned);
        $this->assertSame(5, $owner->current_stars);
        $this->assertSame('Backup koleksi', $owner->notes);
        $this->assertStringStartsWith('2026-10-25', (string) $owner->obtained_at);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    public function test_catalog_checkpoint_control_sparse_merge_preserves_omitted_catalog_fields(): void
    {
        [, $hash] = $this->exportGameToraEvolution();
        $character = UmaCatalogItem::where('gametora_id', 100903)->sole();
        $fields = ['name', 'rarity', 'gametora_id', 'raw_data', 'aptitudes', 'skills', 'objectives'];
        $original = $character->only($fields);

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'uma_catalog_items' => [[
                'name' => $character->name, 'type' => 'character', 'gametora_id' => 100903,
                'skills' => ['evolve' => [['id' => 100903211]]],
            ]],
        ]]])->assertOk();

        $this->assertEquals($original, $character->refresh()->only($fields));
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    public function test_catalog_checkpoint_control_repeated_dirty_merge_keeps_checkpoint_invalid(): void
    {
        $this->assertHistoricalCatalogImportReplaysSync(
            ['skills_awakening' => []],
            ['skills_awakening' => [203391]],
            fn (UmaCatalogItem $item) => array_column($item->skills['awakening'], 'id'),
            [],
            [203391],
            imports: 2,
        );
    }

    public function test_catalog_checkpoint_control_overwrite_of_historical_catalog_invalidates_checkpoint(): void
    {
        $this->assertHistoricalCatalogImportReplaysSync(
            ['title_en' => 'Former'],
            ['title_en' => 'Current'],
            fn (UmaCatalogItem $item) => $item->name,
            'Daiwa Scarlet [Former]',
            'Daiwa Scarlet [Current]',
            mode: 'overwrite',
        );
    }

    private function assertHistoricalCatalogImportReplaysSync(
        array $beforeCard,
        array $afterCard,
        callable $readField,
        mixed $beforeValue,
        mixed $afterValue,
        int $imports = 1,
        string $mode = 'merge',
    ): void {
        $revision = 'catalog-v1';
        $card = ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale', 'rarity' => 3];
        $this->fakeGameTora([], [
            GameToraSyncService::MANIFEST_URL => function () use (&$revision) {
                return Http::response(['characters' => 'bases', 'character-cards' => $revision, 'support-cards' => 'supports',
                    'skills' => 'skills', 'evolutions' => 'first']);
            },
            GameToraSyncService::DATA_BASE_URL.'/character-cards.catalog-v1.json' => Http::response([$beforeCard + $card]),
            GameToraSyncService::DATA_BASE_URL.'/character-cards.catalog-v2.json' => Http::response([$afterCard + $card]),
            GameToraSyncService::DATA_BASE_URL.'/skills.skills.json' => Http::response([
                ['id' => 203381, 'enname' => 'Base Skill'],
                ['id' => 203391, 'enname' => 'Awakening Skill'],
                ['id' => 100903211, 'enname' => 'Scarlet Gale'],
            ]),
        ] + $this->evolutionFixtures($this->evolutionRow()));
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $this->assertSame($beforeValue, $readField(UmaCatalogItem::where('gametora_id', 100903)->sole()));
        $backup = $this->getJson('/api/backup/export')->assertOk()->assertJsonPath('version', '2.0')->json();
        $oldHash = AppSetting::getValue('gametora_manifest_hash');

        $revision = 'catalog-v2';
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertSame($afterValue, $readField(UmaCatalogItem::where('gametora_id', 100903)->sole()));
        $currentHash = AppSetting::getValue('gametora_manifest_hash');
        $this->assertIsString($currentHash);
        $this->assertNotSame($oldHash, $currentHash);

        $checkpoints = [];
        for ($attempt = 0; $attempt < $imports; $attempt++) {
            $this->postJson('/api/backup/import', ['mode' => $mode, 'data' => $backup])->assertOk();
            $this->assertSame($beforeValue, $readField(UmaCatalogItem::where('gametora_id', 100903)->sole()));
            $checkpoints[] = AppSetting::getValue('gametora_manifest_hash');
        }
        $sync = $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->assertSame(
            [array_fill(0, $imports, null), false, $afterValue, $currentHash],
            [$checkpoints, $sync->json('is_up_to_date'), $readField(UmaCatalogItem::where('gametora_id', 100903)->sole()),
                AppSetting::getValue('gametora_manifest_hash')],
        );
    }

    public function test_banner_checkpoint_historical_merge_is_repaired_by_ordinary_sync(): void
    {
        $this->assertHistoricalBannerRestoreReplaysSync('merge', 1);
    }

    public function test_banner_checkpoint_repeated_merge_keeps_checkpoint_invalid(): void
    {
        $this->assertHistoricalBannerRestoreReplaysSync('merge', 2);
    }

    public function test_banner_checkpoint_historical_overwrite_is_repaired_by_ordinary_sync(): void
    {
        $this->assertHistoricalBannerRestoreReplaysSync('overwrite', 1);
    }

    public function test_banner_checkpoint_identical_merge_ignores_row_order_and_date_representation(): void
    {
        $revision = 'banner-v1';
        $this->fakeGameToraBannerRevisions($revision);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $export = $this->getJson('/api/backup/export')->assertOk()->json();
        $rows = array_reverse(array_values(array_filter($export['data']['gacha_banners'], fn (array $row) => in_array($row['gametora_id'], [41001, 41002], true))));
        $this->assertCount(2, $rows);
        foreach ($rows as &$row) {
            $row['id'] += 1000;
            $row['start_date'] .= 'T12:00:00Z';
            $row['end_date'] .= 'T12:00:00Z';
            $row['featured_items'] = json_encode($row['featured_items'], JSON_THROW_ON_ERROR);
            $row = array_reverse($row, true);
        }
        unset($row);

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'gacha_banners' => $rows,
        ]]])->assertOk()->assertJsonPath('summary.gacha_banners', 2);

        $this->assertSame('2026-08-12', GachaBanner::where('gametora_id', 41001)->sole()->end_date->toDateString());
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    public function test_banner_checkpoint_local_banner_merge_preserves_checkpoint(): void
    {
        $revision = 'banner-v1';
        $this->fakeGameToraBannerRevisions($revision);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $hash = AppSetting::getValue('gametora_manifest_hash');
        $banner = GachaBanner::create([
            'name' => 'Banner lokal', 'banner_type' => 'character', 'category' => 'standard',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-12',
        ]);
        $row = array_replace($banner->toArray(), ['end_date' => '2026-08-19']);

        $this->postJson('/api/backup/import', ['mode' => 'merge', 'data' => ['version' => '2.0', 'data' => [
            'gacha_banners' => [$row],
        ]]])->assertOk()->assertJsonPath('summary.gacha_banners', 1);

        $this->assertSame('2026-08-19', $banner->refresh()->end_date->toDateString());
        $this->assertNull($banner->gametora_id);
        $this->assertSame($hash, AppSetting::getValue('gametora_manifest_hash'));
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);
    }

    private function assertHistoricalBannerRestoreReplaysSync(string $mode, int $imports): void
    {
        $catalog = fn (): array => UmaCatalogItem::orderBy('type')->orderBy('name')->get()
            ->map(fn (UmaCatalogItem $item) => $item->only(['type', 'name', 'gametora_id', 'rarity', 'raw_data', 'aptitudes', 'skills', 'objectives', 'details']))
            ->all();
        $revision = 'banner-v1';
        $this->fakeGameToraBannerRevisions($revision);
        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $banner = GachaBanner::where('gametora_id', 41001)->sole();
        $this->assertSame('2026-08-12', $banner->end_date->toDateString());
        $backup = $this->getJson('/api/backup/export')->assertOk()->assertJsonPath('version', '2.0')->json();
        $this->assertNotEmpty($backup['data']['uma_catalog_items']);
        $beforeCatalog = $catalog();
        $oldHash = AppSetting::getValue('gametora_manifest_hash');

        $revision = 'banner-v2';
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->assertSame('2026-08-19', $banner->refresh()->end_date->toDateString());
        $currentHash = AppSetting::getValue('gametora_manifest_hash');
        $this->assertIsString($currentHash);
        $this->assertNotSame($oldHash, $currentHash);
        $this->assertSame($beforeCatalog, $catalog());

        $checkpoints = [];
        for ($attempt = 0; $attempt < $imports; $attempt++) {
            $this->postJson('/api/backup/import', ['mode' => $mode, 'data' => $backup])->assertOk();
            $this->assertSame('2026-08-12', GachaBanner::where('gametora_id', 41001)->sole()->end_date->toDateString());
            $this->assertEquals($beforeCatalog, $catalog());
            $checkpoints[] = AppSetting::getValue('gametora_manifest_hash');
        }
        $sync = $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->assertSame(
            [array_fill(0, $imports, null), false, '2026-08-19', $currentHash],
            [$checkpoints, $sync->json('is_up_to_date'), GachaBanner::where('gametora_id', 41001)->sole()->end_date->toDateString(),
                AppSetting::getValue('gametora_manifest_hash')],
        );
    }

    private function fakeGameToraBannerRevisions(string &$revision): void
    {
        $banner = ['id' => 41001, 'start' => strtotime('2026-08-01'), 'pickups' => [[100903]]];
        $otherBanner = ['id' => 41002, 'start' => strtotime('2026-08-19'), 'end' => strtotime('2026-08-24'), 'pickups' => [[100904]]];
        $this->fakeGameTora([
            ['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale'],
            ['card_id' => 100904, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Crimson'],
        ], [
            GameToraSyncService::MANIFEST_URL => function () use (&$revision) {
                return Http::response(['characters' => 'bases', 'character-cards' => 'cards', 'support-cards' => 'supports',
                    'gacha/char-standard' => $revision]);
            },
            GameToraSyncService::DATA_BASE_URL.'/gacha/char-standard.banner-v1.json' => Http::response([
                $banner + ['end' => strtotime('2026-08-12')], $otherBanner,
            ]),
            GameToraSyncService::DATA_BASE_URL.'/gacha/char-standard.banner-v2.json' => Http::response([
                $banner + ['end' => strtotime('2026-08-19')], $otherBanner,
            ]),
        ]);
    }

    public function test_backup_merge_and_sync_keep_the_same_owned_character_and_foreign_key(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $backup = [
            'mode' => 'merge',
            'data' => ['version' => '2.0', 'data' => [
                'uma_catalog_items' => [
                    ['id' => 900, 'type' => 'character', 'name' => 'Daiwa Scarlet [Backup Title]', 'gametora_id' => 100903],
                ],
                'user_characters' => [[
                    'id' => 901,
                    'name' => 'Daiwa Scarlet [Nama Kepemilikan Lama]',
                    'uma_catalog_item_id' => 900,
                ]],
            ]],
        ];
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $catalogOnly = $backup;
        unset($catalogOnly['data']['data']['user_characters']);
        $this->postJson('/api/backup/import', $catalogOnly)->assertOk();
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Backup Title]', 'Backup Title');

        $this->postJson('/api/backup/import', $backup)->assertOk()->assertJsonPath('unresolved_references', []);
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Backup Title]', 'Backup Title');

        $this->postJson('/api/gacha/sync-gametora')->assertOk();
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');

        $this->postJson('/api/collection/characters/stars', [
            'name' => 'Daiwa Scarlet [Scarlet Gale]',
            'stars' => 4,
        ])->assertOk()->assertJsonPath('character.id', $owned->id);
        $this->assertSame(4, $owned->refresh()->current_stars);
        $this->assertDatabaseCount('user_characters', 1);
    }

    public function test_historical_catalog_alias_cannot_hide_ownership(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet');
        $alias = UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Daiwa Scarlet [Scarlet Gale]',
            'gametora_id' => 100903,
        ]);
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->getJson('/api/collection/characters')->assertOk()
            ->assertJsonCount(1, 'characters')
            ->assertJsonPath('characters.0.id', $owned->id)
            ->assertJsonPath('characters.0.is_owned', true)
            ->assertJsonPath('characters.0.current_stars', 5);
        $this->getJson('/api/collection/characters/detail?id='.$alias->id)->assertOk()
            ->assertJsonPath('character.id', $owned->id)
            ->assertJsonPath('character.is_owned', true)
            ->assertJsonPath('character.current_stars', 5);
        $this->assertSame($owned->uma_catalog_item_id, $owned->fresh()->uma_catalog_item_id);
        $this->assertSame(2, UmaCatalogItem::where('type', 'character')->count());
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }

    public function test_sync_keeps_name_only_legacy_ownership_linked_after_rename(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $catalogId = $owned->uma_catalog_item_id;
        $owned->catalogItem()->update(['gametora_id' => null]);
        $owned->update(['uma_catalog_item_id' => null]);
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk();

        $this->assertSame($catalogId, $owned->refresh()->uma_catalog_item_id);
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');
    }

    public function test_repeated_sync_keeps_the_same_catalog_and_ownership_rows(): void
    {
        $owned = $this->ownedCharacter('Daiwa Scarlet [Old Title]');
        $this->fakeGameTora([['card_id' => 100903, 'name_en' => 'Daiwa Scarlet', 'title_en' => 'Scarlet Gale']]);

        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', false);
        $character = $owned->catalogItem()->firstOrFail();
        $firstCatalogState = $character->getAttributes();
        $firstOwnershipState = $owned->refresh()->getAttributes();
        $this->travel(1)->minute();

        $this->postJson('/api/gacha/sync-gametora', ['force' => true])->assertOk()->assertJsonPath('is_up_to_date', false);
        $this->postJson('/api/gacha/sync-gametora')->assertOk()->assertJsonPath('is_up_to_date', true);

        $this->assertSame($firstCatalogState, $character->refresh()->getAttributes());
        $this->assertSame($firstOwnershipState, $owned->refresh()->getAttributes());
        $this->assertCollectionOwnership($owned, 'Daiwa Scarlet [Scarlet Gale]', 'Scarlet Gale');
    }

    private function ownedCharacter(string $name): UserCharacter
    {
        $character = UmaCatalogItem::create([
            'type' => 'character',
            'name' => $name,
            'gametora_id' => 100903,
            'raw_data' => ['card_id' => 100903],
        ]);

        return UserCharacter::factory()->for($character, 'catalogItem')->create([
            'name' => $name,
            'base_stars' => 3,
            'current_stars' => 5,
            'is_owned' => true,
            'notes' => 'Catatan koleksi',
        ]);
    }

    /** @param list<array<string, mixed>> $cards */
    private function fakeGameTora(array $cards, array $responses = []): void
    {
        Http::fake($responses + [
            GameToraSyncService::MANIFEST_URL => Http::response([
                'characters' => 'bases',
                'character-cards' => 'cards',
                'support-cards' => 'supports',
            ]),
            GameToraSyncService::DATA_BASE_URL.'/characters.bases.json' => Http::response([]),
            GameToraSyncService::DATA_BASE_URL.'/character-cards.cards.json' => Http::response($cards),
            GameToraSyncService::DATA_BASE_URL.'/support-cards.supports.json' => Http::response([]),
            'https://umapyoi.net/api/v1/news/search/twinkle' => Http::response([]),
            'https://umamusume.jp/api/ajax/pr_info_index*' => Http::response([]),
        ]);
    }

    private function evolutionRow(int $cardId = 100903, int $skillId = 100903211): array
    {
        return ['card_id' => $cardId, 'evolutions' => [
            ['new' => $skillId, 'old' => 203381, 'servers' => ['ja'], 'conditions' => [[['stat', 3, 800]]]],
        ]];
    }

    private function evolutionFixtures(array $evolution): array
    {
        return [
            GameToraSyncService::DATA_BASE_URL.'/skills.skills.json' => Http::response([
                ['id' => 203381, 'enname' => 'Base Skill', 'rarity' => 2],
                ['id' => 100903211, 'enname' => 'Scarlet Gale', 'rarity' => 6],
                ['id' => 102902211, 'enname' => 'Creek Evolution', 'rarity' => 6],
            ]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.first.json' => Http::response([$evolution]),
            GameToraSyncService::DATA_BASE_URL.'/evolutions.complete.json' => Http::response([$evolution]),
        ];
    }

    private function assertCollectionOwnership(UserCharacter $owned, string $name, string $title): void
    {
        $this->getJson('/api/collection/characters')->assertOk()
            ->assertJsonPath('characters.0.name', $name)
            ->assertJsonPath('characters.0.costume_title', $title)
            ->assertJsonPath('characters.0.uma_catalog_item_id', $owned->uma_catalog_item_id)
            ->assertJsonPath('characters.0.id', $owned->id)
            ->assertJsonPath('characters.0.is_owned', true)
            ->assertJsonPath('characters.0.current_stars', 5)
            ->assertJsonPath('stats.total_owned', 1)
            ->assertJsonCount(1, 'characters');

        $this->getJson('/api/collection/characters/detail?'.http_build_query(['name' => $name]))->assertOk()
            ->assertJsonPath('character.uma_catalog_item_id', $owned->uma_catalog_item_id)
            ->assertJsonPath('character.id', $owned->id)
            ->assertJsonPath('character.is_owned', true)
            ->assertJsonPath('character.current_stars', 5);

        $this->assertDatabaseHas('uma_catalog_items', [
            'id' => $owned->uma_catalog_item_id,
            'type' => 'character',
            'name' => $name,
            'gametora_id' => 100903,
        ]);
        $this->assertDatabaseHas('user_characters', [
            'id' => $owned->id,
            'uma_catalog_item_id' => $owned->uma_catalog_item_id,
            'is_owned' => true,
            'current_stars' => 5,
            'notes' => 'Catatan koleksi',
        ]);
        $this->assertDatabaseCount('user_characters', 1);
        $this->assertSame([], DB::select('PRAGMA foreign_key_check'));
    }
}
