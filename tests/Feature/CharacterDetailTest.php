<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\UmaCatalogItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CharacterDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_retrieve_character_collection_with_aptitudes_and_skills(): void
    {
        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Special Week [Special Dreamer]',
            'rarity' => 'SSR',
            'aptitudes' => [
                'turf' => 'A',
                'dirt' => 'G',
                'short' => 'F',
                'mile' => 'A',
                'medium' => 'A',
                'long' => 'A',
                'runner' => 'B',
                'leader' => 'A',
                'betweener' => 'A',
                'chaser' => 'C',
            ],
            'skills' => [
                'unique' => [
                    'name_en' => 'Shooting Star',
                    'name_jp' => 'シューティングスター',
                    'type' => 'unique',
                ],
                'innate' => [
                    ['name_en' => 'Up-Tempo', 'name_jp' => 'アップテンポ'],
                ],
                'awakening' => [
                    ['name_en' => 'Gourmand', 'name_jp' => '食いしん坊', 'unlock_level' => 5],
                ],
                'evolve' => [
                    ['name_en' => 'Gluttonous Dreamer', 'name_jp' => '大食い夢追い人', 'replaces' => 'Gourmand'],
                ],
            ],
            'raw_data' => [
                'rarity' => 3,
                'name_en' => 'Special Week',
                'char_id' => 1001,
                'card_id' => 100101,
            ],
        ]);

        $response = $this->getJson('/api/collection/characters');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('characters.0.name', 'Special Week [Special Dreamer]')
            ->assertJsonPath('characters.0.aptitudes.turf', 'A')
            ->assertJsonPath('characters.0.aptitudes.dirt', 'G')
            ->assertJsonPath('characters.0.skills.unique.name_en', 'Shooting Star');
    }

    public function test_can_retrieve_character_detail_by_name(): void
    {
        UmaCatalogItem::create([
            'type' => 'character',
            'name' => 'Epiphaneia [Fate\'s Chosen Star]',
            'rarity' => 'SSR',
            'aptitudes' => [
                'turf' => 'A',
                'dirt' => 'G',
                'short' => 'G',
                'mile' => 'B',
                'medium' => 'A',
                'long' => 'A',
                'runner' => 'B',
                'leader' => 'A',
                'betweener' => 'A',
                'chaser' => 'F',
            ],
            'skills' => [
                'unique' => [
                    'name_en' => 'Cosmic Destiny',
                    'name_jp' => 'コズミック・デスティニー',
                    'type' => 'unique',
                ],
                'innate' => [
                    ['name_en' => 'Straightaway Speed', 'name_jp' => '直線巧者'],
                ],
                'awakening' => [
                    ['name_en' => 'Arc Maestro', 'name_jp' => '円弧のマエストロ', 'unlock_level' => 5],
                ],
                'evolve' => [],
            ],
            'raw_data' => [
                'rarity' => 3,
                'name_en' => 'Epiphaneia',
                'char_id' => 1100,
                'card_id' => 110001,
            ],
        ]);

        // Exact match
        $res = $this->getJson('/api/collection/characters/detail?name=Epiphaneia [Fate\'s Chosen Star]');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('character.name', 'Epiphaneia [Fate\'s Chosen Star]')
            ->assertJsonPath('character.aptitudes.turf', 'A')
            ->assertJsonPath('character.skills.unique.name_en', 'Cosmic Destiny');

        // Partial match by character name
        $resPartial = $this->getJson('/api/collection/characters/detail?name=Epiphaneia');
        $resPartial->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('character.name', 'Epiphaneia [Fate\'s Chosen Star]');

        // Non-existent character
        $resNotFound = $this->getJson('/api/collection/characters/detail?name=NonExistentCharacterXYZ');
        $resNotFound->assertStatus(404)
            ->assertJsonPath('success', false);
    }
}
